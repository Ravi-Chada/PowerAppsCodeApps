import {
  webLightTheme,
  createLightTheme,
  type Theme,
  type BrandVariants,
} from '@fluentui/react-components';

/**
 * Shared theme-token contract for the expense approval app.
 *
 * Every theme pack supplies a complete Fluent v9 `Theme` so that all screens —
 * which are built exclusively on semantic Fluent tokens — reskin automatically
 * without any per-screen changes. Packs also carry a small set of app-level
 * accent tokens for header chrome that fall outside Fluent's token set.
 *
 * Adding a new pack (e.g. a future seasonal theme) only requires implementing
 * this contract and registering it in `THEME_PACKS`.
 */
export type ThemePackId = 'default' | 'halloween';

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

// Orange brand ramp (10 → 160) used to generate the Halloween light theme.
const halloweenBrand: BrandVariants = {
  10: '#050202',
  20: '#1F0E06',
  30: '#371708',
  40: '#4B1E09',
  50: '#602608',
  60: '#762F06',
  70: '#8C3904',
  80: '#A34400',
  90: '#BA4F00',
  100: '#D15B00',
  110: '#E96700',
  120: '#FF7A1F',
  130: '#FF9248',
  140: '#FFAB72',
  150: '#FFC59C',
  160: '#FFDEC6',
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
  halloween: {
    id: 'halloween',
    label: 'Halloween',
    description: 'Spooky orange & purple',
    glyph: '🎃',
    theme: halloweenTheme,
    accents: {
      headerBackground:
        'linear-gradient(90deg, #2E1A47 0%, #6B21A8 45%, #E96700 100%)',
      headerForeground: '#FFFFFF',
    },
  },
};

export const DEFAULT_THEME_PACK: ThemePackId = 'default';

export function isThemePackId(value: string | null | undefined): value is ThemePackId {
  return value === 'default' || value === 'halloween';
}
