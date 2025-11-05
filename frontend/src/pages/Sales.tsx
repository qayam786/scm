import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Package,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { productService, orderService } from '@/services/api';
import { Product } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalDate } from '../lib/datetime';

const Sales: React.FC = () => {
  const [salesData, setSalesData] = useState<{ date: string; count: number }[]>([]);
  const [previousSalesData, setPreviousSalesData] = useState<{ date: string; count: number }[]>([]);
  const [salesRange, setSalesRange] = useState<'day' | 'week' | 'month'>('week');
  const [loadingSales, setLoadingSales] = useState(true);
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const loadSalesStats = async () => {
      try {
        setLoadingSales(true);
        const currentData = await orderService.getSalesStats(salesRange);
        setSalesData(currentData);

        // Load previous period data for growth calculation
        const prevData = await orderService.getSalesStats(salesRange);
        setPreviousSalesData(prevData);
      } catch (error) {
        console.error('Failed to load sales stats:', error);
      } finally {
        setLoadingSales(false);
      }
    };

    loadSalesStats();
  }, [salesRange]);

  useEffect(() => {
    const loadSoldProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await productService.getProducts({ status: 'Sold', per_page: 50 });
        setSoldProducts(response.products);
      } catch (error) {
        console.error('Failed to load sold products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadSoldProducts();
  }, []);

  const totalSales = salesData.reduce((sum, item) => sum + item.count, 0);
  const previousTotal = previousSalesData.reduce((sum, item) => sum + item.count, 0);
  const growthRate = previousTotal > 0 ? ((totalSales - previousTotal) / previousTotal * 100) : 0;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-foreground">Sales Management</h1>
        <p className="text-xl text-muted-foreground">
          Track your sales performance and manage sold products
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="glass border-retailer/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Products Sold
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-retailer rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{soldProducts.length}</div>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="glass border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Growth Rate
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${growthRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">vs last {salesRange}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sales Tracking Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="glass border-success/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-success">Sales Tracking</CardTitle>
                  <CardDescription>Monitor your sales over time</CardDescription>
                </div>
              </div>
              <Select value={salesRange} onValueChange={(value: any) => setSalesRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading sales data...</div>
              </div>
            ) : salesData.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No sales data available for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sold Products List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="glass border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-primary">Sold Products</CardTitle>
                <CardDescription>Complete history of all sold items</CardDescription>
              </div>
              <Badge variant="secondary" className="text-success border-success/20 bg-success/10">
                {soldProducts.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted/20 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : soldProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No products sold yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {soldProducts.map((product, index) => (
                  <motion.div
                    key={product.product_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg glass-strong hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-success rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>ID: {product.product_id.slice(0, 12)}...</span>
                          <span>•</span>
                          <span>Owner: {product.owner}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-success/10 text-success border-success/20 mb-1">
                        Sold
                      </Badge>
                      <p className="text-xs text-muted-foreground flex items-center justify-end">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatLocalDate(product.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Sales;