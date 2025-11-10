import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Search,
  Bell,
  Settings,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { ROLE_CONFIG } from '@/utils/constants';
import { UserRole } from '@/types';
import { motion } from 'framer-motion';

export const DashboardHeader: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme, setUserRole } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Set user role for theme context
  React.useEffect(() => {
    if (user) {
      setUserRole(user.role);
    }
  }, [user, setUserRole]);

  if (!user) return null;

  const userRole = user.role as UserRole;
  const roleConfig = ROLE_CONFIG[userRole];

  return (
    <header className="h-16 border-b border-primary/10 bg-card/30 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">

        <div className="hidden lg:flex items-center space-x-6">
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-4">

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-primary/10 transition-all duration-300 relative group"
            title={theme === 'dark' ? 'Switch to Bright Theme' : 'Switch to Dark Theme'}
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'bright' ? 180 : 0, scale: theme === 'bright' ? 1.1 : 1 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="relative"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-warning group-hover:text-warning/80" />
              ) : (
                <Moon className="h-5 w-5 text-primary group-hover:text-primary/80" />
              )}
            </motion.div>
          </Button>

          {/* Sidebar Toggle */}
          <SidebarTrigger className="hover:bg-primary/10 transition-colors duration-300" />

          {/* Role Badge */}
          <Badge className={`${roleConfig.gradient} text-white border-none px-3 py-1 font-medium`}>
            {roleConfig.label}
          </Badge>

          {/* Security Indicator */}
          <motion.div
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Shield className="w-4 h-4 text-success" />
            <span className="text-success text-sm font-medium">Secured</span>
          </motion.div>
        </div>
      </div>

      {/* Gradient Border */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </header>
  );
};