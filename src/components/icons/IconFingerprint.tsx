import type { IconProps } from './cyberIconUtils';
import { ICON_SIZE_LG, svgStrokeDefaults } from './cyberIconUtils';

export function IconFingerprint({ className = ICON_SIZE_LG }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...svgStrokeDefaults}
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M16.13 13.86c.6 2.34.87 5.14.87 8.14" />
      <path d="M16.5 6.5a7 7 0 0 0-9 9" />
      <path d="M9 2a12 12 0 0 0 0 20" />
      <path d="M6 12a8 8 0 0 0 12 0" />
    </svg>
  );
}
