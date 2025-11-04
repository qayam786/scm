import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ShoppingCart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { orderService, userService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Product } from '@/types';

export default function OrderProducts() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [message, setMessage] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // 🧠 Fetch suppliers (distributors or manufacturers)
    const { data: suppliers } = useQuery({
        queryKey: ['suppliers', user?.role],
        queryFn: () =>
            userService.getUsersByRole(user?.role === 'retailer' ? 'distributor' : 'manufacturer'),
        enabled: !!user,
    });

    // 🧠 Fetch available products (with filter by supplier)
    const { data: availableProducts, isLoading, refetch } = useQuery({
        queryKey: ['available-products', selectedSupplier],
        queryFn: () => orderService.getAvailableProducts(selectedSupplier ? { supplier_username: selectedSupplier } : {}),
        enabled: !!user,
    });

    // 🧠 Mutation for creating an order
    const createOrderMutation = useMutation({
        mutationFn: (orderData: { product_id: string; to_username?: string; message: string }) =>
            orderService.createOrder(orderData),
        onSuccess: () => {
            toast.success('Order placed successfully');
            setDialogOpen(false);
            setMessage('');
            setSelectedSupplier('');
            setSelectedProduct(null);
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create order');
        },
    });

    // 🧩 Handle supplier selection (re-fetch available products)
    const handleSupplierChange = (value: string) => {
        setSelectedSupplier(value);
        refetch(); // refetch products with this supplier filter
    };

    const handleOrderSubmit = () => {
        if (!selectedProduct || !message.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        createOrderMutation.mutate({
            product_id: selectedProduct.product_id,
            to_username: selectedSupplier || undefined,
            message: message.trim(),
        });
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
                    <h1 className="text-3xl font-bold">Order Products</h1>
                    <p className="text-muted-foreground mt-2">
                        Browse available products from{' '}
                        {user?.role === 'retailer' ? 'distributors' : 'manufacturers'}
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-2">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {availableProducts?.length || 0} Available
                </Badge>
            </div>

            {/* Supplier Filter Dropdown */}
            {suppliers && suppliers.length > 0 && (
                <div className="flex items-center space-x-4">
                    <Label>Select {user?.role === 'retailer' ? 'Distributor' : 'Manufacturer'}</Label>
                    <Select value={selectedSupplier} onValueChange={handleSupplierChange}>
                        <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Choose a supplier or leave blank to view all" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((s: any) => (
                                <SelectItem key={s.username} value={s.username}>
                                    {s.username}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {!availableProducts || availableProducts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No products available</p>
                        <p className="text-sm text-muted-foreground">Try selecting a different supplier</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableProducts.map((product: Product, index: number) => (
                        <motion.div
                            key={product.product_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        {product.name}
                                    </CardTitle>
                                    <CardDescription>{product.description || 'No description'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Custodian:</span>
                                        <span className="font-medium">{product.custodian}</span>
                                    </div>

                                    <Dialog
                                        open={dialogOpen && selectedProduct?.product_id === product.product_id}
                                        onOpenChange={(open) => {
                                            setDialogOpen(open);
                                            if (!open) {
                                                setSelectedProduct(null);
                                                setMessage('');
                                            }
                                        }}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                className="w-full"
                                                onClick={() => setSelectedProduct(product)}
                                            >
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Request Order
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Place Order</DialogTitle>
                                                <DialogDescription>
                                                    Request this product from the selected supplier
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Product</Label>
                                                    <div className="p-3 bg-muted rounded-md">
                                                        <p className="font-medium">{product.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Custodian: {product.custodian}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="message">Message *</Label>
                                                    <Textarea
                                                        id="message"
                                                        placeholder="Enter your order details (e.g., quantity, delivery date)"
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                        rows={4}
                                                    />
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => setDialogOpen(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        className="flex-1"
                                                        onClick={handleOrderSubmit}
                                                        disabled={createOrderMutation.isPending || !message.trim()}
                                                    >
                                                        {createOrderMutation.isPending ? 'Placing...' : 'Place Order'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}