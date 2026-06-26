import { useCallback, useEffect, useState } from 'react';
import { makeStyles, tokens, Text, Button } from '@fluentui/react-components';
import {
  Add24Regular,
  Add24Filled,
  ListBar24Regular,
  ListBar24Filled,
  Checkmark24Regular,
  Checkmark24Filled,
  DataPie24Regular,
  DataPie24Filled,
  ArrowClockwise24Regular,
} from '@fluentui/react-icons';
import { SubmitScreen } from './screens/SubmitScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { ActionsScreen } from './screens/ActionsScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { listFeedback, listActionItems, type Feedback, type ActionItem } from './lib/data';

type Tab = 'submit' | 'review' | 'actions' | 'insights';

const TABS: {
  id: Tab;
  label: string;
  icon: React.ReactElement;
  activeIcon: React.ReactElement;
}[] = [
  { id: 'submit', label: 'Submit', icon: <Add24Regular />, activeIcon: <Add24Filled /> },
  { id: 'review', label: 'Review', icon: <ListBar24Regular />, activeIcon: <ListBar24Filled /> },
  {
    id: 'actions',
    label: 'Actions',
    icon: <Checkmark24Regular />,
    activeIcon: <Checkmark24Filled />,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: <DataPie24Regular />,
    activeIcon: <DataPie24Filled />,
  },
];

const TITLES: Record<Tab, string> = {
  submit: 'Submit Feedback',
  review: 'Review Feedback',
  actions: 'Action Items',
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
  const [tab, setTab] = useState<Tab>('review');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [fb, ai] = await Promise.all([listFeedback(), listActionItems()]);
      setFeedback(fb);
      setActionItems(ai);
    } catch {
      // Errors surface within screens; keep last-known data.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Text size={500} weight="semibold" className={styles.headerTitle}>
          {TITLES[tab]}
        </Text>
        <Button
          appearance="transparent"
          className={styles.refreshBtn}
          icon={<ArrowClockwise24Regular />}
          aria-label="Refresh"
          onClick={() => void refresh()}
        />
      </header>

      <main className={styles.content}>
        {tab === 'submit' && (
          <SubmitScreen
            onSubmitted={() => {
              void refresh();
            }}
          />
        )}
        {tab === 'review' && (
          <ReviewScreen
            feedback={feedback}
            actionItems={actionItems}
            loading={loading}
            onChanged={() => void refresh()}
          />
        )}
        {tab === 'actions' && (
          <ActionsScreen
            actionItems={actionItems}
            feedback={feedback}
            loading={loading}
            onChanged={() => void refresh()}
          />
        )}
        {tab === 'insights' && <InsightsScreen feedback={feedback} loading={loading} />}
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
