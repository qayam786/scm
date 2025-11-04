from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models import User
from utils.roles import role_required

bp = Blueprint("users", __name__, url_prefix="/api/users")

@bp.route("/list_by_role", methods=["GET"])
@jwt_required()
@role_required(["manufacturer", "distributor", "retailer", "super_admin"])
def list_users_by_role():
    """
    Get all users for a given role.
    Example: GET /api/users/list_by_role?role=distributor
    Returns: [{ "username": "d1", "role": "distributor" }, ...]
    """
    role = request.args.get("role", "").strip().lower().replace('"', '').replace("'", "")
    if not role:
        return jsonify({"error": "Role query parameter is required"}), 400

    valid_roles = ["manufacturer", "distributor", "retailer"]
    if role not in valid_roles:
        return jsonify({"error": f"Invalid role. Choose from {valid_roles}"}), 400

    users = User.query.filter(User.role == role).all()
    if not users:
        return jsonify([]), 200

    result = [{"username": u.username, "role": u.role} for u in users]
    return jsonify(result), 200