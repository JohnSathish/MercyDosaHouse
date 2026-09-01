import Link from 'next/link';
import { FiMapPin, FiPhone, FiClock, FiInstagram, FiFacebook, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { BRAND } from '@mdh/utils';
import { SiteLogo } from '@/components/site-logo';
import { LiveVisitorCounter } from '@/components/live-visitor-counter';
import { GooglePlayBadge } from '@/components/google-play-badge';

const BASECODE_LABS_URL = 'https://basecodelabs.com';
const FSSAI_FALLBACK = '21726006000529';

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

export function SiteFooter({
  phone = '9566363655',
  whatsapp,
  email,
  address = 'Tura, Meghalaya',
  hours = '7:00 AM - 10:00 PM',
  socialLinks,
  fssaiRegistrationNumber,
  fssaiCertificateUrl,
  compact = false,
}: SiteFooterProps) {
  const fssai = fssaiRegistrationNumber?.trim() || FSSAI_FALLBACK;
  const instagram = socialHref(socialLinks, ['instagram', 'ig']);
  const facebook = socialHref(socialLinks, ['facebook', 'fb']);
  const waNumber = (whatsapp || '').replace(/\D/g, '');
  const whatsappHref = waNumber
    ? `https://wa.me/${waNumber}`
    : socialHref(socialLinks, ['whatsapp']);

  const quickLinks = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/about', label: 'About Us' },
    { href: '/track', label: 'Order Tracking' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/faq', label: 'FAQ' },
    { href: '/terms', label: 'Terms' },
    { href: '/refunds', label: 'Returns' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/contact', label: 'Contact Us' },
  ];

  return (
    <footer className="bg-[#14532D] text-white">
      <div
        className={`container mx-auto px-4 ${compact ? 'py-8 grid grid-cols-1 gap-8' : 'py-14 grid md:grid-cols-3 gap-10'}`}
      >
        <div>
          <SiteLogo size="md" className="mb-3" />
          <p className="text-white/75 text-sm leading-relaxed">{BRAND.tagline}</p>
          <p className="text-white/60 text-sm mt-3">
            Freshly made on order. Delivering happiness to your doorstep.
          </p>
          <div className="mt-5">
            <GooglePlayBadge size="md" />
            <p className="mt-3 text-sm font-semibold text-white/70">Coming soon on iOS</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-secondary">Quick Links</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-white/80 hover:text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-secondary">Contact</h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <FiMapPin className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
              {address}
            </li>
            {phone ? (
              <li className="flex items-center gap-2">
                <FiPhone className="w-4 h-4 shrink-0 text-secondary" />
                <a href={`tel:${phone}`} className="hover:text-secondary transition-colors">
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex items-center gap-2">
                <FiMail className="w-4 h-4 shrink-0 text-secondary" />
                <a href={`mailto:${email}`} className="hover:text-secondary transition-colors">
                  {email}
                </a>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <FiClock className="w-4 h-4 shrink-0 text-secondary" />
              {hours}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-sm text-secondary">✓</span>
              <span>
                <span className="block text-xs text-white/60">FSSAI Registration</span>
                <Link href="/fssai" className="hover:text-secondary transition-colors">
                  {fssai}
                </Link>
                {fssaiCertificateUrl ? (
                  <a
                    href={fssaiCertificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-secondary underline"
                  >
                    Certificate
                  </a>
                ) : null}
              </span>
            </li>
          </ul>
          {(whatsappHref || instagram || facebook) && (
            <div className="mt-6 flex gap-3">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp className="w-5 h-5" />
                </a>
              ) : null}
              {instagram ? (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                  aria-label="Instagram"
                >
                  <FiInstagram className="w-5 h-5" />
                </a>
              ) : null}
              {facebook ? (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary hover:text-[#1F2937] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                  aria-label="Facebook"
                >
                  <FiFacebook className="w-5 h-5" />
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6 space-y-5">
          <LiveVisitorCounter />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-white/50">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
            </p>
            <p className="text-center sm:text-right">
              Powered by:{' '}
              <a
                href={BASECODE_LABS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300/90 hover:text-amber-200 underline underline-offset-4 decoration-amber-300/30 hover:decoration-amber-200/60 transition-colors font-medium"
              >
                BaseCode Labs Pvt. Ltd.
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
