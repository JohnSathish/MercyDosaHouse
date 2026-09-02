import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@mdh/ui';
import { BRAND } from '@mdh/utils';

const LOGO_SRC = '/images/logo.png';

interface SiteLogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

interface SiteLogoProps extends SiteLogoMarkProps {
  /** When set, wraps logo in a single Link. Omit when placing inside buttons or other links. */
  href?: string;
  linkClassName?: string;
}

const sizes = {
  sm: { img: 40, text: 'text-lg' },
  md: { img: 48, text: 'text-xl md:text-2xl' },
  lg: { img: 72, text: 'text-2xl md:text-3xl' },
};

/** Logo image + optional name — never renders an anchor. Safe inside buttons. */
export function SiteLogoMark({ size = 'md', showName = false, className = '' }: SiteLogoMarkProps) {
  const { img, text } = sizes[size];

  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-2.5 group ${className}`}>
      <Image
        src={LOGO_SRC}
        alt={`${BRAND.name} logo`}
        width={img}
        height={img}
        className="rounded-full object-cover shrink-0 ring-2 ring-white/20 group-hover:ring-secondary/50 transition-all duration-300"
        priority={size === 'sm'}
      />
      {showName && (
        <span
          className={`min-w-0 truncate font-bold tracking-tight group-hover:opacity-90 transition-opacity ${text}`}
        >
          {BRAND.name}
        </span>
      )}
    </span>
  );
}

export function SiteLogo({
  size = 'md',
  showName = false,
  className = '',
  href,
  linkClassName,
}: SiteLogoProps) {
  const mark = <SiteLogoMark size={size} showName={showName} className={className} />;

  if (href) {
    return (
      <Link
        href={href}
        className={cn('inline-flex', linkClassName)}
        aria-label={`${BRAND.name} home`}
      >
        {mark}
      </Link>
    );
  }

  return mark;
}

export { LOGO_SRC };
