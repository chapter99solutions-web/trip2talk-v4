import type { IconProps } from './cyberIconUtils';
import { ICON_SIZE_SM, svgStrokeDefaults } from './cyberIconUtils';

export function IconBackspace({ className = ICON_SIZE_SM }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...svgStrokeDefaults}
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
      <path d="M15 10l-4 4 4 4" />
    </svg>
  );
}
