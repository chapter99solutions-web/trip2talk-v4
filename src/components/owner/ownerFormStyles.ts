/** Light fields for white modals (breaks inherited owner dashboard `color: white`). */
export const OWNER_LIGHT_FIELD_CLS =
  'bg-white text-[#1a1a1a] placeholder:text-[#9ca3af] [color-scheme:light]';

/** Dark-surface fields on navy dashboard (explicit text + readable select options). */
export const OWNER_DARK_FIELD_CLS =
  'rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/40 [&>option]:text-[#1a1a1a] [&>option]:bg-white [color-scheme:dark]';

export const OWNER_DARK_FIELD_MT_CLS = `mt-1 w-full ${OWNER_DARK_FIELD_CLS}`;

export const OWNER_DARK_FIELD_FULL_CLS = `w-full ${OWNER_DARK_FIELD_CLS}`;
