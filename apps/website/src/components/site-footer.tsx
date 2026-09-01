import Link from 'next/link';
import { FiMapPin, FiPhone, FiInstagram, FiFacebook, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { BRAND } from '@mdh/utils';
import { SiteLogo } from '@/components/site-logo';
import { LiveVisitorCounter } from '@/components/live-visitor-counter';

const BASECODE_LABS_URL = 'https://basecodelabs.com';

interface SiteFooterProps {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  hours?: string;
  socialLinks?: Record<string, string> | null;
  fssaiRegistrationNumber?: string | null;
  fssaiCertificateUrl?: string | null;
  compact?: boolean;
}

function socialHref(
  socialLinks: Record<string, string> | null | undefined,
  keys: string[],
): string | null {
  if (!socialLinks) return null;
  for (const key of keys) {
    const value =
      socialLinks[key] || socialLinks[key.toLowerCase()] || socialLinks[key.toUpperCase()];
    if (value && value.trim() && value.trim() !== '#') return value.trim();
  }
  return null;
}

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/offers', label: 'Offers' },
  { href: '/about', label: 'About Us' },
  { href: '/track', label: 'Order Tracking' },
  { href: '/contact', label: 'Contact Us' },
];

const SERVICE_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/#home-delivery', label: 'Delivery Information' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refunds', label: 'Refund Policy' },
];

export function SiteFooter({
  phone,
  whatsapp,
  email,
  address = 'Tura, Meghalaya',
  hours: _hours,
  socialLinks,
  compact = false,
}: SiteFooterProps) {
  const instagram = socialHref(socialLinks, ['instagram', 'ig']);
  const facebook = socialHref(socialLinks, ['facebook', 'fb']);
  const waNumber = (whatsapp || '').replace(/\D/g, '');
  const whatsappHref = waNumber
    ? `https://wa.me/${waNumber}`
    : socialHref(socialLinks, ['whatsapp']);

  return (
    <footer className="bg-[#0B542F] text-white">
      <div
        className={`container mx-auto px-4 ${compact ? 'py-10 grid grid-cols-1 gap-8' : 'py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4'}`}
      >
        <div>
          <SiteLogo size="md" className="mb-3" />
          <p className="text-sm font-medium leading-relaxed text-white/80">
            Freshly Made. Delivered With Love.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-[#F5A000]">
            Quick Links
          </h4>
          <ul className="space-y-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-white/80 transition-colors hover:text-[#F5A000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A000] rounded"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-[#F5A000]">
            Customer Service
          </h4>
          <ul className="space-y-2">
            {SERVICE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-white/80 transition-colors hover:text-[#F5A000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A000] rounded"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-[#F5A000]">
            Contact Us
          </h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A000]" />
              {address}
            </li>
            {phone ? (
              <li className="flex items-center gap-2">
                <FiPhone className="h-4 w-4 shrink-0 text-[#F5A000]" />
                <a href={`tel:${phone}`} className="hover:text-[#F5A000]">
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex items-center gap-2">
                <FiMail className="h-4 w-4 shrink-0 text-[#F5A000]" />
                <a href={`mailto:${email}`} className="hover:text-[#F5A000]">
                  {email}
                </a>
              </li>
            ) : null}
          </ul>
          {(whatsappHref || instagram || facebook) && (
            <div className="mt-6 flex gap-3">
              {facebook ? (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#F5A000] hover:text-[#18352A]"
                  aria-label="Facebook"
                >
                  <FiFacebook className="h-5 w-5" />
                </a>
              ) : null}
              {instagram ? (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#F5A000] hover:text-[#18352A]"
                  aria-label="Instagram"
                >
                  <FiInstagram className="h-5 w-5" />
                </a>
              ) : null}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#F5A000] hover:text-[#18352A]"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp className="h-5 w-5" />
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto space-y-4 px-4 py-6">
          <LiveVisitorCounter />
          <div className="flex flex-col gap-3 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {BRAND.name}. All Rights Reserved.
            </p>
            <p>
              Made with{' '}
              <a
                href={BASECODE_LABS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-300/90 underline underline-offset-4"
              >
                BaseCode Labs
              </a>{' '}
              in Tura, Meghalaya
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
