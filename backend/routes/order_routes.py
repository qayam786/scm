from flask import Blueprint, request, jsonify, current_app, url_for
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from models import Order, Product, User
from utils.roles import role_required
from utils.helpers import now_ts
import uuid

bp = Blueprint("orders", __name__, url_prefix="/api/orders")

# Bottom-up hierarchy mapping
ORDER_TARGET_ROLE = {
    "retailer": "distributor",
    "distributor": "manufacturer"
}


@bp.route("/create", methods=["POST"])
@jwt_required()
@role_required(["retailer", "distributor"])
def create_order():
    """
    Place an order upstream.
    Body: { product_id, to_username (optional), message (optional) }
    """
    claims = get_jwt()
    actor = claims.get("username")
    role = claims.get("role")

    data = request.json or {}
    product_id = data.get("product_id")
    to_username = data.get("to_username")
    message = data.get("message", "")

    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    product = Product.query.filter_by(product_id=product_id).first()
    if not product:
        return jsonify({"error": "product not found"}), 404

    expected_role = ORDER_TARGET_ROLE.get(role)
    if not expected_role:
        return jsonify({"error": f"Role '{role}' cannot place upstream orders"}), 403

    # Resolve recipient
    final_to = None
    if to_username:
        recipient = User.query.filter_by(username=to_username).first()
        if not recipient:
            return jsonify({"error": f"recipient '{to_username}' not found"}), 404
        if recipient.role != expected_role:
            return jsonify({"error": f"recipient must be a '{expected_role}'"}), 400
        final_to = recipient.username
    else:
        # pick first user with expected role (development fallback)
        recipient = User.query.filter_by(role=expected_role).first()
        if not recipient:
            return jsonify({"error": f"No users with role '{expected_role}' available"}), 404
        final_to = recipient.username

    order = Order(
        order_id=str(uuid.uuid4()),
        product_id=product_id,
        from_user=actor,
        to_user=final_to,
        message=message,
        status="Pending",
        created_at=now_ts(),
        updated_at=now_ts()
    )

    db.session.add(order)
    db.session.commit()

    # blockchain audit
    block_info = None
    try:
        bc = current_app.config.get("BLOCKCHAIN")
        # if bc:
        #     block = bc.add_block({
        #         "type": "order_created",
        #         "order_id": order.order_id,
        #         "product_id": product_id,
        #         "from": actor,
        #         "to": final_to,
        #         "message": message
        #     })
        #     block_info = block.to_dict()
    except Exception as e:
        current_app.logger.error(f"BLOCKCHAIN_ORDER_CREATE_FAIL: {e}")
        block_info = None

    return jsonify({"message": "Order created", "order": order.to_dict(), "block": block_info}), 201


@bp.route("/my_orders", methods=["GET"])
@jwt_required()
def my_orders():
    """
    Returns orders where the user is sender or receiver.
    query params: ?role_filter=sent|received&status=Pending|Accepted|Rejected|Fulfilled
    """
    claims = get_jwt()
    user = claims.get("username")
    role_filter = request.args.get("role_filter")
    status = request.args.get("status")

    q = Order.query
    if role_filter == "sent":
        q = q.filter_by(from_user=user)
    elif role_filter == "received":
        q = q.filter_by(to_user=user)
    else:
        q = q.filter((Order.from_user == user) | (Order.to_user == user))

    if status:
        q = q.filter_by(status=status)

    orders = q.order_by(Order.created_at.desc()).all()
    order_list = []
    for o in orders:
        order_data = o.to_dict()
        product = Product.query.filter_by(product_id=o.product_id).first()
        order_data["product_name"] = product.name if product else "Unknown Product"
        order_list.append(order_data)
    return jsonify(order_list), 200


@bp.route("/<order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    claims = get_jwt()
    user = claims.get("username")
    order = Order.query.filter_by(order_id=order_id).first()
    if not order:
        return jsonify({"error": "order not found"}), 404
    if user not in (order.from_user, order.to_user) and claims.get("role") != "super_admin":
        return jsonify({"error": "access denied"}), 403
    return jsonify(order.to_dict()), 200


@bp.route("/<order_id>/update_status", methods=["POST"])
@jwt_required()
def update_order_status(order_id):
    """
    Receiver updates order status to Accepted / Rejected / Fulfilled
    When status is Accepted, returns next_action hint for frontend:
      { next_action: "redirect_to_custodian_transfer", transfer_prefill: { product_id, transfer_to_username } }
    No automation is performed server-side (custody transfer remains manual).
    """
    claims = get_jwt()
    actor = claims.get("username")
    role = claims.get("role")
    data = request.json or {}
    new_status = data.get("status")
    note = data.get("note", "")

    if new_status not in ("Accepted", "Rejected", "Fulfilled"):
        return jsonify({"error": "invalid status"}), 400

    order = Order.query.filter_by(order_id=order_id).first()
    if not order:
        return jsonify({"error": "order not found"}), 404

    # Only recipient (to_user) or super_admin can change
    if actor != order.to_user and claims.get("role") != "super_admin":
        return jsonify({"error": "only recipient can update order status"}), 403

    # State transitions allowed: Pending->Accepted/Rejected, Accepted->Fulfilled
    if not ((order.status == "Pending" and new_status in ("Accepted", "Rejected")) or
            (order.status == "Accepted" and new_status == "Fulfilled") or
            (order.status == "Fulfilled" and new_status == "Fulfilled")):
        return jsonify({"error": f"invalid transition from {order.status} to {new_status}"}), 403

    order.status = new_status
    order.updated_at = now_ts()
    db.session.commit()

    # blockchain log
    block_info = None
    try:
        bc = current_app.config.get("BLOCKCHAIN")
        # if bc:
        #     block = bc.add_block({
        #         "type": "order_status_updated",
        #         "order_id": order.order_id,
        #         "new_status": new_status,
        #         "updated_by": actor,
        #         "note": note
        #     })
        #     block_info = block.to_dict()
    except Exception as e:
        current_app.logger.error(f"BLOCKCHAIN_ORDER_UPDATE_FAIL: {e}")

    # When accepted, return frontend hint to redirect the distributor to custody transfer page
    if new_status == "Accepted":
        # The order.from_user is the requester (retailer or distributor)
        transfer_hint = {
            "next_action": "redirect_to_custodian_transfer",
            "transfer_prefill": {
                "product_id": order.product_id,
                "transfer_to_username": order.from_user
            }
        }
    else:
        transfer_hint = None

    return jsonify({
        "message": "Order status updated",
        "order": order.to_dict(),
        "block": block_info,
        "next_action": transfer_hint
    }), 200
