import {
  webLightTheme,
  createLightTheme,
  type Theme,
  type BrandVariants,
} from '@fluentui/react-components';

/**
 * Shared theme-token contract for the field service dispatch app.
 *
 * Every theme pack supplies a complete Fluent v9 `Theme` so that all screens —
 * which are built exclusively on semantic Fluent tokens — reskin automatically
 * without any per-screen changes. Packs also carry a small set of app-level
 * accent tokens for header chrome that fall outside Fluent's token set.
 *
 * Adding a new pack (e.g. a future seasonal theme) only requires implementing
 * this contract and registering it in `THEME_PACKS`.
 */
export type ThemePackId = 'default' | 'nightshift' | 'halloween';

export interface ThemePackAccents {
  /** Header background; a solid color or any CSS background value (gradients allowed). */
  headerBackground: string;
  /** Header foreground used for the title and icon buttons. */
  headerForeground: string;
}

export interface ThemePack {
  id: ThemePackId;
  label: string;
  description: string;
  /** Optional decorative glyph shown beside the header title. */
  glyph?: string;
  /** Full Fluent v9 theme applied through FluentProvider. */
  theme: Theme;
  accents: ThemePackAccents;
}

// Teal brand ramp (10 → 160) used to generate the Night Shift light theme.
const nightShiftBrand: BrandVariants = {
  10: '#020405',
  20: '#0E1A1F',
  30: '#122B34',
  40: '#143845',
  50: '#154656',
  60: '#155568',
  70: '#13647B',
  80: '#0F748F',
  90: '#0884A3',
  100: '#0094B8',
  110: '#16A5CB',
  120: '#3DB5D8',
  130: '#62C5E4',
  140: '#88D4EE',
  150: '#AFE3F6',
  160: '#D6F1FB',
};

const nightShiftTheme: Theme = createLightTheme(nightShiftBrand);

// Pumpkin-orange brand ramp (10 → 160) used to generate the Halloween light theme.
const halloweenBrand: BrandVariants = {
  10: '#050200',
  20: '#1F0F00',
  30: '#351A00',
  40: '#472200',
  50: '#5A2B00',
  60: '#6E3500',
  70: '#833F00',
  80: '#984900',
  90: '#AE5400',
  100: '#C45F00',
  110: '#DB6A00',
  120: '#F37500',
  130: '#FF8B22',
  140: '#FFA34D',
  150: '#FFBC7D',
  160: '#FFD7AE',
};

const halloweenTheme: Theme = createLightTheme(halloweenBrand);

export const THEME_PACKS: Record<ThemePackId, ThemePack> = {
  default: {
    id: 'default',
    label: 'Default',
    description: 'Standard light theme',
    theme: webLightTheme,
    accents: {
      headerBackground: webLightTheme.colorBrandBackground,
      headerForeground: webLightTheme.colorNeutralForegroundOnBrand,
    },
  },
  nightshift: {
    id: 'nightshift',
    label: 'Night Shift',
    description: 'High-contrast teal for low-light field work',
    glyph: '🌙',
    theme: nightShiftTheme,
    accents: {
      headerBackground: 'linear-gradient(90deg, #0E1A1F 0%, #155568 55%, #0094B8 100%)',
      headerForeground: '#FFFFFF',
    },
  },
  halloween: {
    id: 'halloween',
    label: 'Halloween',
    description: 'Seasonal pumpkin-orange with a spooky purple header',
    glyph: '🎃',
    theme: halloweenTheme,
    accents: {
      headerBackground: 'linear-gradient(90deg, #2A0A45 0%, #6E1F00 55%, #FF7518 100%)',
      headerForeground: '#FFFFFF',
    },
  },
};

export const DEFAULT_THEME_PACK: ThemePackId = 'default';

export function isThemePackId(value: string | null | undefined): value is ThemePackId {
  return value === 'default' || value === 'nightshift' || value === 'halloween';
}
