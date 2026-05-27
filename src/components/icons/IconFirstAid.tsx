import type { IconProps } from './cyberIconUtils';
import { ICON_SIZE_SM } from './cyberIconUtils';

export function IconFirstAid({ className = ICON_SIZE_SM }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path d="M12 6v12" />
      <path d="M6 12h12" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
