import { useMemo } from 'react';
import { makeStyles, tokens, Card, Text, Badge, Spinner } from '@fluentui/react-components';
import type { Expense } from '../lib/data';
import {
  CATEGORIES,
  EXPENSE_STATUS,
  label,
  statusColor,
  formatCurrency,
  slaInfo,
  formatHours,
  SLA_HOURS,
} from '../lib/expense';

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
    fontSize: '24px',
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
  expenses: Expense[];
  loading: boolean;
}

export function InsightsScreen({ expenses, loading }: InsightsScreenProps) {
  const styles = useStyles();

  const stats = useMemo(() => {
    const total = expenses.length;
    const pending = expenses.filter(
      (e) => e.expaa_status === 1 || e.expaa_status === 2,
    ).length;

    const approvedAmount = expenses
      .filter((e) => e.expaa_status === 3 || e.expaa_status === 5)
      .reduce((sum, e) => sum + (e.expaa_amount ?? 0), 0);

    // Average approval turnaround for decided expenses.
    const decided = expenses.filter(
      (e) => e.expaa_status === 3 || e.expaa_status === 4 || e.expaa_status === 5,
    );
    const turnarounds = decided.map(
      (e) => slaInfo(e.expaa_submittedon, e.expaa_decisionon, e.expaa_status).hours,
    );
    const avgTurnaround = turnarounds.length
      ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
      : 0;

    // SLA breaches among still-pending requests.
    const breaches = expenses.filter(
      (e) => slaInfo(e.expaa_submittedon, e.expaa_decisionon, e.expaa_status).breached,
    ).length;

    const categoryAmount = new Map<number, number>();
    const statusCounts = new Map<number, number>();
    expenses.forEach((e) => {
      if (e.expaa_category) {
        categoryAmount.set(
          e.expaa_category,
          (categoryAmount.get(e.expaa_category) ?? 0) + (e.expaa_amount ?? 0),
        );
      }
      if (e.expaa_status) {
        statusCounts.set(e.expaa_status, (statusCounts.get(e.expaa_status) ?? 0) + 1);
      }
    });

    return {
      total,
      pending,
      approvedAmount,
      avgTurnaround,
      breaches,
      categoryAmount,
      statusCounts,
    };
  }, [expenses]);

  if (loading) {
    return <Spinner label="Loading insights…" />;
  }

  if (expenses.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>No expenses yet. Submit some to see insights.</Text>
      </div>
    );
  }

  const maxCategory = Math.max(1, ...Array.from(stats.categoryAmount.values()));

  return (
    <div className={styles.grid}>
      <div className={styles.kpiRow}>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.total}</div>
          <Text size={200} className={styles.kpiLabel}>
            Total expenses
          </Text>
        </Card>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.pending}</div>
          <Text size={200} className={styles.kpiLabel}>
            Pending
          </Text>
        </Card>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{formatCurrency(stats.approvedAmount)}</div>
          <Text size={200} className={styles.kpiLabel}>
            Approved $
          </Text>
        </Card>
      </div>

      <div className={styles.kpiRow}>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>
            {stats.avgTurnaround > 0 ? formatHours(stats.avgTurnaround) : '—'}
          </div>
          <Text size={200} className={styles.kpiLabel}>
            Avg turnaround
          </Text>
        </Card>
        <Card className={styles.kpi}>
          <div className={styles.kpiValue}>{stats.breaches}</div>
          <Text size={200} className={styles.kpiLabel}>
            SLA breaches ({SLA_HOURS}h)
          </Text>
        </Card>
      </div>

      <Card>
        <Text weight="semibold">Spend by category</Text>
        <div style={{ marginTop: 12 }}>
          {Object.keys(CATEGORIES)
            .map(Number)
            .map((c) => {
              const amount = stats.categoryAmount.get(c) ?? 0;
              const pct = Math.round((amount / maxCategory) * 100);
              return (
                <div key={c} className={styles.barRow}>
                  <div className={styles.barTop}>
                    <Text size={200}>{CATEGORIES[c]}</Text>
                    <Text size={200}>{formatCurrency(amount)}</Text>
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
          {[1, 2, 3, 4, 5].map((s) => (
            <Badge key={s} appearance="tint" color={statusColor(s)} size="large">
              {label(EXPENSE_STATUS, s)}: {stats.statusCounts.get(s) ?? 0}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
