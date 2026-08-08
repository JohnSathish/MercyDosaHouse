'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User, ShoppingBag, Heart, Settings } from 'lucide-react';
import { Button } from '@mdh/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogoutDialog } from '@/components/dashboard/logout-dialog';
import { getInitials } from '@/components/dashboard/types';
import { getStoredUser, isAuthenticated, logout, isCustomer, isAdminUser } from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import { useCartStore } from '@/lib/cart-store';

interface UserMenuProps {
  transparent?: boolean;
}

export function UserMenu({ transparent }: UserMenuProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = mounted ? getStoredUser() : null;
  const authenticated = mounted && isAuthenticated();
  const clearCart = useCartStore((s) => s.clearCart);
  const toast = useToastStore((s) => s.show);

  useEffect(() => setMounted(true), []);

  const loginButton = (
    <Link href="/login">
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 ${transparent ? 'text-white hover:bg-white/10' : ''}`}
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Login</span>
      </Button>
    </Link>
  );

  if (!mounted) {
    return loginButton;
  }

  if (!authenticated || !user) {
    return loginButton;
  }

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout(API_URL);
      clearCart();
      setLogoutOpen(false);
      toast('Logged out successfully.');
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const firstName = user.name?.split(' ')[0] || 'Profile';
  const isStaff = !isCustomer(user);
  const adminPortal = APP_URLS.admin;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
              transparent ? 'hover:bg-white/10 text-white' : 'hover:bg-primary/5 text-[#1F2937]'
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-semibold">{firstName}</span>
            <ChevronDown className="w-4 h-4 opacity-70 hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isStaff ? (
            <>
              {isAdminUser(user) && (
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = adminPortal;
                  }}
                >
                  <Settings className="w-4 h-4" /> Admin Portal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                <User className="w-4 h-4" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard?tab=orders')}>
                <ShoppingBag className="w-4 h-4" /> Orders
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard?tab=favorites')}>
                <Heart className="w-4 h-4" /> Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard?tab=settings')}>
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="w-4 h-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
        loading={loading}
      />
    </>
  );
}
