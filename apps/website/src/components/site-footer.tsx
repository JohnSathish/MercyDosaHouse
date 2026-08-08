import Link from 'next/link';
import { FiMapPin, FiPhone, FiClock, FiInstagram, FiFacebook } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { BRAND } from '@mdh/utils';
import { SiteLogo } from '@/components/site-logo';

interface SiteFooterProps {
  phone?: string;
  whatsapp?: string;
  address?: string;
  hours?: string;
  compact?: boolean;
}

export function SiteFooter({
  phone = '9566363655',
  whatsapp = '919566363655',
  address = 'Tura, Meghalaya',
  hours = '7:00 AM - 10:00 PM',
  compact = false,
}: SiteFooterProps) {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <footer className="bg-[#14532D] text-white">
      <div
        className={`container mx-auto px-4 ${compact ? 'py-8 grid grid-cols-1 gap-6' : 'py-14 grid md:grid-cols-2 lg:grid-cols-4 gap-10'}`}
      >
        <div>
          <SiteLogo size="md" className="mb-3" />
          <p className="text-white/75 text-sm leading-relaxed">{BRAND.tagline}</p>
          <p className="text-white/60 text-sm mt-3">
            Freshly made on order. Delivering happiness to your doorstep.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-secondary">Contact</h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <FiMapPin className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
              {address}
            </li>
            <li className="flex items-center gap-2">
              <FiPhone className="w-4 h-4 shrink-0 text-secondary" />
              <a href={`tel:${phone}`} className="hover:text-secondary transition-colors">
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <FiClock className="w-4 h-4 shrink-0 text-secondary" />
              {hours}
            </li>
          </ul>
        </div>

        {!compact && (
          <div>
            <h4 className="font-semibold mb-4 text-secondary">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/80 hover:text-secondary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={compact ? 'col-span-1' : ''}>
          <h4 className="font-semibold mb-4 text-secondary">Follow Us</h4>
          <div className="flex gap-3">
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all"
              aria-label="WhatsApp"
            >
              <FaWhatsapp className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all"
              aria-label="Instagram"
            >
              <FiInstagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all"
              aria-label="Facebook"
            >
              <FiFacebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-white/50">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
