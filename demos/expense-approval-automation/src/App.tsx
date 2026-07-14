import { useCallback, useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItemRadio,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Add24Filled,
  CheckmarkCircle24Regular,
  CheckmarkCircle24Filled,
  ClipboardTask24Regular,
  ClipboardTask24Filled,
  DataPie24Regular,
  DataPie24Filled,
  ArrowClockwise24Regular,
  PaintBrush24Regular,
} from '@fluentui/react-icons';
import { SubmitScreen } from './screens/SubmitScreen';
import { ApprovalsScreen } from './screens/ApprovalsScreen';
import { TrackScreen } from './screens/TrackScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { listExpenses, listApprovals, type Expense, type Approval } from './lib/data';
import { useAppTheme } from './theme/themeContext';
import { THEME_PACKS, isThemePackId } from './theme/themePacks';

type Tab = 'submit' | 'approvals' | 'track' | 'insights';

const TABS: {
  id: Tab;
  label: string;
  icon: React.ReactElement;
  activeIcon: React.ReactElement;
}[] = [
  { id: 'submit', label: 'Submit', icon: <Add24Regular />, activeIcon: <Add24Filled /> },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: <CheckmarkCircle24Regular />,
    activeIcon: <CheckmarkCircle24Filled />,
  },
  {
    id: 'track',
    label: 'Track',
    icon: <ClipboardTask24Regular />,
    activeIcon: <ClipboardTask24Filled />,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: <DataPie24Regular />,
    activeIcon: <DataPie24Filled />,
  },
];

const TITLES: Record<Tab, string> = {
  submit: 'Submit Expense',
  approvals: 'Pending Approvals',
  track: 'Track & SLA',
  insights: 'Insights',
};

const useStyles = makeStyles({
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '480px',
    margin: '0 auto',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  headerTitle: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  refreshBtn: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    paddingBottom: '88px',
  },
  nav: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow8,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 0 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
  },
  navItemActive: {
    color: tokens.colorBrandForeground1,
  },
  navLabel: {
    fontSize: '11px',
  },
});

function App() {
  const styles = useStyles();
  const { packId, pack, setPackId } = useAppTheme();
  const [tab, setTab] = useState<Tab>('approvals');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ex, ap] = await Promise.all([listExpenses(), listApprovals()]);
      setExpenses(ex);
      setApprovals(ap);
    } catch {
      // Errors surface within screens; keep last-known data.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load on mount; refresh is stable (useCallback with []).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return (
    <div className={styles.app}>
      <header
        className={styles.header}
        style={{
          background: pack.accents.headerBackground,
          color: pack.accents.headerForeground,
        }}
      >
        <Text
          size={500}
          weight="semibold"
          className={styles.headerTitle}
          style={{ color: pack.accents.headerForeground }}
        >
          {pack.glyph ? `${pack.glyph} ` : ''}
          {TITLES[tab]}
        </Text>
        <div className={styles.headerActions}>
          <Menu
            checkedValues={{ theme: [packId] }}
            onCheckedValueChange={(_, data) => {
              const next = data.checkedItems[0];
              if (isThemePackId(next)) {
                setPackId(next);
              }
            }}
          >
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="transparent"
                className={styles.refreshBtn}
                style={{ color: pack.accents.headerForeground }}
                icon={<PaintBrush24Regular />}
                aria-label="Change theme"
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {Object.values(THEME_PACKS).map((p) => (
                  <MenuItemRadio key={p.id} name="theme" value={p.id}>
                    {p.glyph ? `${p.glyph} ` : ''}
                    {p.label}
                  </MenuItemRadio>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <Button
            appearance="transparent"
            className={styles.refreshBtn}
            style={{ color: pack.accents.headerForeground }}
            icon={<ArrowClockwise24Regular />}
            aria-label="Refresh"
            onClick={() => void refresh()}
          />
        </div>
      </header>

      <main className={styles.content}>
        {tab === 'submit' && (
          <SubmitScreen
            onSubmitted={() => {
              void refresh();
            }}
          />
        )}
        {tab === 'approvals' && (
          <ApprovalsScreen
            expenses={expenses}
            approvals={approvals}
            loading={loading}
            onChanged={() => void refresh()}
          />
        )}
        {tab === 'track' && (
          <TrackScreen expenses={expenses} approvals={approvals} loading={loading} />
        )}
        {tab === 'insights' && <InsightsScreen expenses={expenses} loading={loading} />}
      </main>

      <nav className={styles.nav}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
            >
              {active ? t.activeIcon : t.icon}
              <span className={styles.navLabel}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
