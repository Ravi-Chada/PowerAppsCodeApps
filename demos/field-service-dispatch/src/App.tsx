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
  VehicleTruckProfile24Regular,
  VehicleTruckProfile24Filled,
  Wrench24Regular,
  Wrench24Filled,
  DataPie24Regular,
  DataPie24Filled,
  ArrowClockwise24Regular,
  PaintBrush24Regular,
} from '@fluentui/react-icons';
import { IntakeScreen } from './screens/IntakeScreen';
import { DispatchScreen } from './screens/DispatchScreen';
import { JobsScreen } from './screens/JobsScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { listTickets, listStatusLogs, type Ticket, type StatusLog } from './lib/data';
import { useAppTheme } from './theme/themeContext';
import { THEME_PACKS, isThemePackId } from './theme/themePacks';

type Tab = 'intake' | 'dispatch' | 'jobs' | 'insights';

const TABS: {
  id: Tab;
  label: string;
  icon: React.ReactElement;
  activeIcon: React.ReactElement;
}[] = [
  { id: 'intake', label: 'Intake', icon: <Add24Regular />, activeIcon: <Add24Filled /> },
  {
    id: 'dispatch',
    label: 'Dispatch',
    icon: <VehicleTruckProfile24Regular />,
    activeIcon: <VehicleTruckProfile24Filled />,
  },
  {
    id: 'jobs',
    label: 'My Jobs',
    icon: <Wrench24Regular />,
    activeIcon: <Wrench24Filled />,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: <DataPie24Regular />,
    activeIcon: <DataPie24Filled />,
  },
];

const TITLES: Record<Tab, string> = {
  intake: 'Log a Ticket',
  dispatch: 'Dispatch Board',
  jobs: 'My Jobs',
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
  const [tab, setTab] = useState<Tab>('dispatch');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tk, lg] = await Promise.all([listTickets(), listStatusLogs()]);
      setTickets(tk);
      setLogs(lg);
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
        {tab === 'intake' && (
          <IntakeScreen
            onCreated={() => {
              void refresh();
            }}
          />
        )}
        {tab === 'dispatch' && (
          <DispatchScreen
            tickets={tickets}
            logs={logs}
            loading={loading}
            onChanged={() => void refresh()}
          />
        )}
        {tab === 'jobs' && (
          <JobsScreen tickets={tickets} loading={loading} onChanged={() => void refresh()} />
        )}
        {tab === 'insights' && <InsightsScreen tickets={tickets} loading={loading} />}
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
