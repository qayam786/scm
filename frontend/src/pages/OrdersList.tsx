import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { orderService, productService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_COLORS = {
  Pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Accepted: 'bg-green-500/10 text-green-500 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  Fulfilled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export default function OrdersList() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('received');

  const { data: receivedOrders, isLoading: loadingReceived } = useQuery({
    queryKey: ['orders-received', statusFilter],
    queryFn: () => orderService.getMyOrders({
      role_filter: 'received',
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
  });

  const { data: sentOrders, isLoading: loadingSent } = useQuery({
    queryKey: ['orders-sent', statusFilter],
    queryFn: () => orderService.getMyOrders({
      role_filter: 'sent',
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
  });

  // Fetch product info once to map IDs to names
  const { data: products } = useQuery({
    queryKey: ['products-for-orders'],
    queryFn: () => productService.getProducts({}),
  });

  const getProductName = (productId: string) => {
    const product = products?.products?.find((p: any) => p.product_id === productId);
    return product?.name || 'Unknown Product';
  };

  const renderOrderCard = (order: any, index: number, isSent: boolean) => (
    <motion.div
      key={order.order_id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-shadow border-border/40">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                {isSent ? (
                  <ArrowUpRight className="h-4 w-4 text-orange-500" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4 text-green-500" />
                )}
                {getProductName(order.product_id)}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isSent ? `To: ${order.to_user}` : `From: ${order.from_user}`}
              </CardDescription>
            </div>
            <Badge className={STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {new Date(order.created_at * 1000).toLocaleDateString()}
            </span>
          </div>

          {order.message && (
            <div className="p-2 bg-muted rounded text-sm">
              <p className="text-muted-foreground text-xs mb-1">Message:</p>
              <p>{order.message}</p>
            </div>
          )}

          {order.note && (
            <div className="p-2 bg-muted rounded text-sm">
              <p className="text-muted-foreground text-xs mb-1">Note:</p>
              <p>{order.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const isLoading = loadingReceived || loadingSent;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            Track your product orders and requests
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Fulfilled">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="received" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Received ({receivedOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Sent ({sentOrders?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !receivedOrders || receivedOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No received orders</p>
                <p className="text-sm text-muted-foreground">
                  Orders you receive will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedOrders.map((order: any, index: number) =>
                renderOrderCard(order, index, false)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !sentOrders || sentOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No sent orders</p>
                <p className="text-sm text-muted-foreground">
                  Orders you place will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentOrders.map((order: any, index: number) =>
                renderOrderCard(order, index, true)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}