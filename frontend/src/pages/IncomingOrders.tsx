import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, XCircle, User, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { orderService, productService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function IncomingOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [note, setNote] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject'>('accept');

  const { data: incomingOrders, isLoading } = useQuery({
    queryKey: ['incoming-orders'],
    queryFn: () => orderService.getMyOrders({ role_filter: 'received', status: 'Pending' }),
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-orders'],
    queryFn: () => productService.getProducts({}),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note?: string }) =>
      orderService.updateOrderStatus(orderId, status, note),
    onSuccess: (_, variables) => {
      toast.success(`Order ${variables.status.toLowerCase()} successfully`);
      setActionDialogOpen(false);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      // If accepted, redirect to product detail page (actions tab) with pre-filled recipient
      if (variables.status === 'Accepted' && selectedOrder) {
        const product = products?.products?.find((p: any) => p.product_id === selectedOrder.product_id);
        if (product) {
          const recipientRole = user?.role === 'distributor' ? 'retailer' : 'distributor';
          toast.success(`Redirecting to transfer product to ${recipientRole}...`, {
            description: `Transfer ${product.name} to ${selectedOrder.from_user}`
          });
          setTimeout(() => {
            navigate(`/product/${product.product_id}?transferTo=${selectedOrder.from_user}#actions`);
          }, 1500);
        }
      }
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update order');
    },
  });

  const handleAction = (order: any, type: 'accept' | 'reject') => {
    setSelectedOrder(order);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedOrder) return;

    updateOrderMutation.mutate({
      orderId: selectedOrder.order_id,
      status: actionType === 'accept' ? 'Accepted' : 'Rejected',
      note: note.trim() || undefined,
    });
  };

  const getProductName = (productId: string) => {
    const product = products?.products?.find((p: any) => p.product_id === productId);
    return product?.name || productId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incoming Orders</h1>
          <p className="text-muted-foreground mt-2">
            Review and respond to orders from {user?.role === 'distributor' ? 'retailers' : 'distributors'}
          </p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          {incomingOrders?.length || 0} Pending
        </Badge>
      </div>

      {!incomingOrders || incomingOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No pending orders</p>
            <p className="text-sm text-muted-foreground">New orders will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incomingOrders.map((order: any, index: number) => (
            <motion.div
              key={order.order_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {getProductName(order.product_id)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Order ID: {order.order_id}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-medium">{order.from_user}</span>
                    </div>
                    {order.created_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Requested:</span>
                        <span className="font-medium">
                          {new Date(order.created_at * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {order.message && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Message:</p>
                          <p className="text-sm text-muted-foreground">{order.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAction(order, 'reject')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleAction(order, 'accept')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Accept Order' : 'Reject Order'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept'
                ? user?.role === 'distributor'
                  ? 'You will be redirected to transfer this product to the retailer'
                  : 'This will update the order status to Accepted'
                : 'Are you sure you want to reject this order?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedOrder && (
              <div className="space-y-2">
                <Label>Order Details</Label>
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="text-sm"><span className="font-medium">Product:</span> {getProductName(selectedOrder.product_id)}</p>
                  <p className="text-sm"><span className="font-medium">From:</span> {selectedOrder.from_user}</p>
                  {selectedOrder.message && (
                    <p className="text-sm"><span className="font-medium">Message:</span> {selectedOrder.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder={actionType === 'accept' ? 'e.g., Will dispatch in 2 days' : 'e.g., Out of stock'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmAction}
                disabled={updateOrderMutation.isPending}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {updateOrderMutation.isPending ? 'Processing...' : `Confirm ${actionType === 'accept' ? 'Accept' : 'Reject'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}