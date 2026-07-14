import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import {
  THEME_PACKS,
  DEFAULT_THEME_PACK,
  isThemePackId,
  type ThemePackId,
} from './themePacks';
import { ThemeContext } from './themeContext';

// Per-user persistence key. In a Power Apps code app each browser user has their
// own localStorage, so this scopes the selection to the signed-in user's device.
const STORAGE_KEY = 'expaa.themePack';

function loadInitialPack(): ThemePackId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemePackId(stored)) {
      return stored;
    }
  } catch {
    // localStorage can be unavailable (private mode / sandbox); fall back.
  }
  return DEFAULT_THEME_PACK;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [packId, setPackIdState] = useState<ThemePackId>(loadInitialPack);

  const setPackId = useCallback((id: ThemePackId) => {
    setPackIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore persistence failures; selection still applies for the session.
    }
  }, []);

  const pack = THEME_PACKS[packId];

  const value = useMemo(
    () => ({ packId, pack, setPackId }),
    [packId, pack, setPackId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <FluentProvider theme={pack.theme} style={{ height: '100%' }}>
        {children}
      </FluentProvider>
    </ThemeContext.Provider>
  );
}
