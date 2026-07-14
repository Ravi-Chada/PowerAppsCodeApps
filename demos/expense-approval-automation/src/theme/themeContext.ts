import { createContext, useContext } from 'react';
import type { ThemePack, ThemePackId } from './themePacks';

export interface ThemeContextValue {
  packId: ThemePackId;
  pack: ThemePack;
  setPackId: (id: ThemePackId) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return ctx;
}
