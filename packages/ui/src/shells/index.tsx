'use client';

import * as React from 'react';
import { cn, brand } from '../lib/utils';
import { Button } from '../components/button';

interface NavItem {
  href: string;
  label: string;
}

interface CustomerShellProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  cartCount?: number;
}

export function CustomerShell({ children, navItems = [], cartCount = 0 }: CustomerShellProps) {
  const defaultNav: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/gallery', label: 'Gallery' },
  ];
  const items = navItems.length ? navItems : defaultNav;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">{brand.name}</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/cart">
              <Button variant="outline" size="sm">
                Cart {cartCount > 0 && `(${cartCount})`}
              </Button>
            </a>
            <a href="/menu">
              <Button size="sm">Order Now</Button>
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg text-primary mb-2">{brand.name}</h3>
            <p className="text-sm text-muted-foreground">{brand.tagline}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Quick Links</h4>
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-sm text-muted-foreground">Fresh dosas delivered to your door</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  navItems: NavItem[];
  userName?: string;
  onLogout?: () => void;
}

export function AdminShell({
  children,
  title = 'Admin',
  navItems,
  userName,
  onLogout,
}: AdminShellProps) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-primary text-primary-foreground hidden md:flex flex-col">
        <div className="p-6 border-b border-primary-foreground/20">
          <h1 className="font-bold text-lg">{brand.name}</h1>
          <p className="text-xs opacity-80">{title}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-6">
          <h2 className="font-semibold">{title} Dashboard</h2>
          <div className="flex items-center gap-4">
            {userName && <span className="text-sm text-muted-foreground">{userName}</span>}
            {onLogout && (
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            )}
          </div>
        </header>
        <main className={cn('flex-1 p-6 bg-muted/20')}>{children}</main>
      </div>
    </div>
  );
}

export function KitchenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="h-16 border-b border-gray-700 flex items-center px-6">
        <h1 className="text-2xl font-bold">{brand.name} — Kitchen</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

export function DeliveryShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4 sticky top-0 bg-background z-10">
        <h1 className="font-bold text-primary">{brand.name} — Delivery</h1>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
