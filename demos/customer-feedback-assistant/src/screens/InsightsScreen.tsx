import { useMemo } from 'react';
import { makeStyles, tokens, Card, Text, Badge, Spinner } from '@fluentui/react-components';
import type { Feedback } from '../lib/data';
import {
  THEMES,
  SENTIMENTS,
  FEEDBACK_STATUS,
  label,
  sentimentColor,
  feedbackStatusColor,
} from '../lib/feedback';

const useStyles = makeStyles({
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  kpiRow: {
    display: 'flex',
    gap: '12px',
  },
  kpi: {
    flex: 1,
    textAlign: 'center',
    padding: '16px 8px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  kpiLabel: {
    color: tokens.colorNeutralForeground3,
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '10px',
  },
  barTop: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    backgroundColor: tokens.colorBrandBackground,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
});

interface InsightsScreenProps {
  feedback: Feedback[];
  loading: boolean;
}

function countBy(items: Feedback[], key: (f: Feedback) => number | undefined) {
  const counts = new Map<number, number>();
  items.forEach((f) => {
    const k = key(f);
    if (k === undefined || k === null) return;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  return counts;
}

export function InsightsScreen({ feedback, loading }: InsightsScreenProps) {
  const styles = useStyles();

  const stats = useMemo(() => {
    const total = feedback.length;
    const themeCounts = countBy(feedback, (f) => f.crfaa_theme);
    const sentimentCounts = countBy(feedback, (f) => f.crfaa_sentiment);
    const statusCounts = countBy(feedback, (f) => f.crfaa_status);
    const ratings = feedback
      .map((f) => f.crfaa_rating)
      .filter((r): r is number => typeof r === 'number' && r > 0);
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '—';
    const open = (statusCounts.get(1) ?? 0) + (statusCounts.get(2) ?? 0);
    return { total, themeCounts, sentimentCounts, statusCounts, avgRating, open };
  }, [feedback]);

  if (loading) {
    return <Spinner label="Loading insights…" />;
  }

  if (feedback.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>No feedback yet. Submit some to see insights.</Text>
      </div>
    );
  }

  const maxTheme = Math.max(1, ...Array.from(stats.themeCounts.values()));

  return (
    <div className={styles.grid}>
      <div className={styles.kpiRow}>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.total}</div>
          <Text size={200} className={styles.kpiLabel}>
            Total feedback
          </Text>
        </Card>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.avgRating}</div>
          <Text size={200} className={styles.kpiLabel}>
            Avg rating
          </Text>
        </Card>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.open}</div>
          <Text size={200} className={styles.kpiLabel}>
            Open items
          </Text>
        </Card>
      </div>

      <Card>
        <Text weight="semibold">Sentiment</Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {[1, 2, 3].map((s) => (
            <Badge key={s} appearance="tint" color={sentimentColor(s)} size="large">
              {label(SENTIMENTS, s)}: {stats.sentimentCounts.get(s) ?? 0}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <Text weight="semibold">Top themes</Text>
        <div style={{ marginTop: 12 }}>
          {Object.keys(THEMES)
            .map(Number)
            .map((t) => {
              const count = stats.themeCounts.get(t) ?? 0;
              const pct = Math.round((count / maxTheme) * 100);
              return (
                <div key={t} className={styles.barRow}>
                  <div className={styles.barTop}>
                    <Text size={200}>{THEMES[t]}</Text>
                    <Text size={200}>{count}</Text>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      <Card>
        <Text weight="semibold">Status breakdown</Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {[1, 2, 3, 4].map((s) => (
            <Badge key={s} appearance="tint" color={feedbackStatusColor(s)} size="large">
              {label(FEEDBACK_STATUS, s)}: {stats.statusCounts.get(s) ?? 0}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
