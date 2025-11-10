import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole } from '@/types';

type Theme = 'dark' | 'bright';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setUserRole: (role: UserRole) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('app-theme');
    return (stored as Theme) || 'dark';
  });
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme classes
    root.classList.remove('dark', 'manufacturer-bright', 'distributor-bright', 'retailer-bright', 'admin-bright');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'bright' && userRole) {
      // Apply role-specific bright theme
      const roleThemeMap: Record<UserRole, string> = {
        manufacturer: 'manufacturer-bright',
        distributor: 'distributor-bright',
        retailer: 'retailer-bright',
        super_admin: 'admin-bright',
      };
      root.classList.add(roleThemeMap[userRole]);
    }
    
    localStorage.setItem('app-theme', theme);
  }, [theme, userRole]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'bright' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setUserRole }}>
      {children}
    </ThemeContext.Provider>
  );
};