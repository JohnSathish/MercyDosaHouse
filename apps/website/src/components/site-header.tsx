'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiPhone, FiShoppingCart } from 'react-icons/fi';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@mdh/ui';
import { SiteLogo } from '@/components/site-logo';
import { UserMenu } from '@/components/dashboard/user-menu';
import { useCartStore } from '@/lib/cart-store';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/#offers', label: 'Offers' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

interface SiteHeaderProps {
  phone?: string;
  fssaiRegistrationNumber?: string | null;
  /** When true, header is inside the fixed top stack (not independently fixed) */
  embedded?: boolean;
}

export function SiteHeader({
  phone = '9566363655',
  fssaiRegistrationNumber,
  embedded = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const transparent = isHome && !scrolled;
  const count = mounted ? cartCount : 0;

  return (
    <header
      className={`${embedded ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 transition-all duration-300 ${
        transparent ? 'glass-nav-transparent text-white' : 'glass-nav text-[#1F2937]'
      }`}
    >
      <div className="container mx-auto flex h-16 md:h-[4.5rem] items-center justify-between px-4">
        <SiteLogo size="sm" showName href="/" />

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10 ${
                transparent ? 'hover:text-secondary' : 'hover:text-primary hover:bg-primary/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {fssaiRegistrationNumber ? (
          <Link
            href="/fssai"
            title={`FSSAI Registration No. ${fssaiRegistrationNumber}`}
            aria-label="View FSSAI registration details"
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 ${
              transparent
                ? 'border-white/35 bg-white/15 text-white hover:bg-white/25'
                : 'border-emerald-200 bg-emerald-50 text-[#14532D] hover:border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>FSSAI Registered</span>
          </Link>
        ) : null}

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={`tel:${phone}`}
            className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              transparent ? 'hover:bg-white/10' : 'hover:bg-primary/5 text-primary'
            }`}
          >
            <FiPhone className="w-4 h-4" />
            <span className="hidden md:inline">Call</span>
          </a>
          <Link href="/cart">
            <Button
              size="sm"
              className={`relative gap-1.5 ${
                transparent
                  ? 'border-2 border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white'
                  : 'border border-primary/30 bg-white text-primary hover:bg-primary/5'
              }`}
            >
              <FiShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-secondary text-[#1F2937] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          <UserMenu transparent={transparent} />
          <Link href="/menu" className="hidden md:block">
            <Button
              size="sm"
              className="btn-glow bg-secondary text-[#1F2937] hover:bg-secondary/90 font-semibold"
            >
              Order Now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
