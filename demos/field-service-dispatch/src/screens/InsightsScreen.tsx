import { useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Badge,
  Text,
  Spinner,
} from '@fluentui/react-components';
import type { Ticket } from '../lib/data';
import {
  CATEGORIES,
  URGENCIES,
  TICKET_STATUS,
  label,
  statusColor,
  urgencyColor,
  formatHours,
  slaInfo,
  STATUS_COMPLETED,
  STATUS_CANCELLED,
} from '../lib/dispatch';

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  kpiValue: {
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  kpiLabel: {
    color: tokens.colorNeutralForeground3,
  },
  sectionTitle: {
    marginBottom: '8px',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  barLabel: {
    width: '88px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
  },
  track: {
    flex: 1,
    height: '12px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
  },
  barCount: {
    width: '24px',
    textAlign: 'right',
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
});

interface InsightsScreenProps {
  tickets: Ticket[];
  loading: boolean;
}

export function InsightsScreen({ tickets, loading }: InsightsScreenProps) {
  const styles = useStyles();

  const stats = useMemo(() => {
    const total = tickets.length;
    const completed = tickets.filter((t) => t.fsd_status === STATUS_COMPLETED);
    const cancelled = tickets.filter((t) => t.fsd_status === STATUS_CANCELLED).length;
    const open = total - completed.length - cancelled;

    // Average resolution time (reported → completed) in hours.
    const resolutionHours = completed
      .map((t) => {
        const start = t.fsd_reportedon ?? t.createdon;
        const end = t.fsd_completedon;
        if (!start || !end) return null;
        const ms = new Date(end).getTime() - new Date(start).getTime();
        return ms > 0 ? ms / (1000 * 60 * 60) : null;
      })
      .filter((h): h is number => h !== null);
    const avgResolution =
      resolutionHours.length > 0
        ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
        : 0;

    // SLA breaches across all open tickets.
    const breaches = tickets.filter(
      (t) => slaInfo(t.fsd_reportedon ?? t.createdon, t.fsd_urgency, t.fsd_status).breached,
    ).length;

    const byStatus = new Map<number, number>();
    const byCategory = new Map<number, number>();
    const byUrgency = new Map<number, number>();
    for (const t of tickets) {
      if (t.fsd_status != null) byStatus.set(t.fsd_status, (byStatus.get(t.fsd_status) ?? 0) + 1);
      if (t.fsd_category != null)
        byCategory.set(t.fsd_category, (byCategory.get(t.fsd_category) ?? 0) + 1);
      if (t.fsd_urgency != null)
        byUrgency.set(t.fsd_urgency, (byUrgency.get(t.fsd_urgency) ?? 0) + 1);
    }

    return {
      total,
      open,
      completed: completed.length,
      avgResolution,
      breaches,
      byStatus,
      byCategory,
      byUrgency,
    };
  }, [tickets]);

  if (loading) {
    return <Spinner label="Crunching the numbers…" />;
  }

  if (stats.total === 0) {
    return (
      <div className={styles.empty}>
        <Text>No tickets yet. Log one from the Intake tab to see insights.</Text>
      </div>
    );
  }

  const catMax = Math.max(1, ...stats.byCategory.values());

  return (
    <div className={styles.wrap}>
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiValue}>{stats.total}</span>
          <Text size={200} className={styles.kpiLabel}>
            Total tickets
          </Text>
        </Card>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiValue}>{stats.open}</span>
          <Text size={200} className={styles.kpiLabel}>
            Open
          </Text>
        </Card>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiValue}>{stats.completed}</span>
          <Text size={200} className={styles.kpiLabel}>
            Completed
          </Text>
        </Card>
        <Card className={styles.kpiCard}>
          <span
            className={styles.kpiValue}
            style={{ color: stats.breaches > 0 ? tokens.colorPaletteRedForeground1 : undefined }}
          >
            {stats.breaches}
          </span>
          <Text size={200} className={styles.kpiLabel}>
            SLA breaches
          </Text>
        </Card>
      </div>

      <Card>
        <Text weight="semibold" className={styles.kpiLabel}>
          Avg. resolution time
        </Text>
        <span className={styles.kpiValue}>
          {stats.completed > 0 ? formatHours(stats.avgResolution) : '—'}
        </span>
        <Text size={200} className={styles.kpiLabel}>
          Reported to completed, across {stats.completed} job{stats.completed === 1 ? '' : 's'}.
        </Text>
      </Card>

      <Card>
        <Text weight="semibold" className={styles.sectionTitle}>
          By status
        </Text>
        <div className={styles.badgeRow}>
          {[...stats.byStatus.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([status, count]) => (
              <Badge key={status} appearance="tint" color={statusColor(status)}>
                {label(TICKET_STATUS, status)}: {count}
              </Badge>
            ))}
        </div>
      </Card>

      <Card>
        <Text weight="semibold" className={styles.sectionTitle}>
          By category
        </Text>
        {[...stats.byCategory.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => (
            <div key={cat} className={styles.barRow}>
              <Text size={200} className={styles.barLabel}>
                {label(CATEGORIES, cat)}
              </Text>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${(count / catMax) * 100}%` }} />
              </div>
              <Text size={200} className={styles.barCount}>
                {count}
              </Text>
            </div>
          ))}
      </Card>

      <Card>
        <Text weight="semibold" className={styles.sectionTitle}>
          By urgency
        </Text>
        <div className={styles.badgeRow}>
          {[...stats.byUrgency.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([urg, count]) => (
              <Badge key={urg} appearance="tint" color={urgencyColor(urg)}>
                {label(URGENCIES, urg)}: {count}
              </Badge>
            ))}
        </div>
      </Card>
    </div>
  );
}
