export type IconProps = {
  className?: string;
};

export const ICON_SIZE_SM = 'w-5 h-5';
export const ICON_SIZE_LG = 'w-12 h-12';

export const svgStrokeDefaults = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
