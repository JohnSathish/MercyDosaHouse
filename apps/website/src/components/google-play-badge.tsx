import { FaGooglePlay } from 'react-icons/fa';
import { ANDROID_APP_URL } from '@mdh/utils';

type BadgeSize = 'sm' | 'md';

export function GooglePlayBadge({
  size = 'md',
  className = '',
  href = ANDROID_APP_URL,
  onClick,
}: {
  size?: BadgeSize;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const compact = size === 'sm';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label="Download the Mercy Dosa House app on Google Play"
      className={`inline-flex items-center gap-2 rounded-lg bg-[#01875F] text-white shadow-sm ring-1 ring-black/10 transition hover:bg-[#016b4c] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE68A] ${
        compact ? 'px-2 py-1' : 'px-3 py-2'
      } ${className}`}
    >
      <FaGooglePlay className={compact ? 'h-4 w-4 shrink-0' : 'h-6 w-6 shrink-0'} aria-hidden />
      <span className="flex flex-col leading-none text-left">
        <span
          className={
            compact
              ? 'text-[8px] font-medium tracking-wide'
              : 'text-[9px] font-medium tracking-wide'
          }
        >
          GET IT ON
        </span>
        <span className={compact ? 'text-[11px] font-semibold' : 'text-sm font-semibold'}>
          Google Play
        </span>
      </span>
    </a>
  );
}
