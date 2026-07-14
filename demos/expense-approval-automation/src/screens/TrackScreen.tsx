import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Badge,
  Dropdown,
  Option,
  Field,
  Spinner,
  Button,
} from '@fluentui/react-components';
import { Money24Regular } from '@fluentui/react-icons';
import type { Expense, Approval } from '../lib/data';
import {
  CATEGORIES,
  EXPENSE_STATUS,
  choiceOptions,
  label,
  statusColor,
  formatCurrency,
  formatDate,
  slaInfo,
  formatHours,
} from '../lib/expense';
import { markReimbursed, STATUS_APPROVED } from '../lib/data';

const useStyles = makeStyles({
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  filterField: {
    flex: 1,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'flex-start',
  },
  amount: {
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  badges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '6px',
    alignItems: 'center',
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  reimburse: {
    marginTop: '8px',
    alignSelf: 'flex-start',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
});

interface TrackScreenProps {
  expenses: Expense[];
  approvals: Approval[];
  loading: boolean;
}

const ALL = 'all';

export function TrackScreen({ expenses, approvals, loading }: TrackScreenProps) {
  const styles = useStyles();
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Local override so a reimbursed row updates immediately without a full refetch.
  const [reimbursed, setReimbursed] = useState<Set<string>>(new Set());

  const trailCount = useMemo(() => {
    const map = new Map<string, number>();
    approvals.forEach((a) => {
      const id = a._expaa_expenseid_value;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    });
    return map;
  }, [approvals]);

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (statusFilter !== ALL && String(e.expaa_status) !== statusFilter) return false;
        if (categoryFilter !== ALL && String(e.expaa_category) !== categoryFilter) return false;
        return true;
      }),
    [expenses, statusFilter, categoryFilter],
  );

  async function handleReimburse(id: string) {
    setBusyId(id);
    try {
      await markReimbursed(id);
      setReimbursed((prev) => new Set(prev).add(id));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <Spinner label="Loading expenses…" />;
  }

  return (
    <div>
      <div className={styles.filters}>
        <Field className={styles.filterField} label="Status">
          <Dropdown
            value={statusFilter === ALL ? 'All' : EXPENSE_STATUS[Number(statusFilter)]}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => d.optionValue && setStatusFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(EXPENSE_STATUS).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field className={styles.filterField} label="Category">
          <Dropdown
            value={categoryFilter === ALL ? 'All' : CATEGORIES[Number(categoryFilter)]}
            selectedOptions={[categoryFilter]}
            onOptionSelect={(_, d) => d.optionValue && setCategoryFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(CATEGORIES).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Text>No expenses match these filters.</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((e) => {
            const isReimbursed = reimbursed.has(e.expaa_expenseid);
            const effectiveStatus = isReimbursed ? 5 : e.expaa_status;
            const sla = slaInfo(e.expaa_submittedon, e.expaa_decisionon, effectiveStatus);
            const decided = effectiveStatus === 3 || effectiveStatus === 4 || effectiveStatus === 5;
            return (
              <Card key={e.expaa_expenseid}>
                <div className={styles.top}>
                  <Text weight="semibold">{e.expaa_name || '(no purpose)'}</Text>
                  <Text className={styles.amount}>{formatCurrency(e.expaa_amount)}</Text>
                </div>
                {e.expaa_employeename && (
                  <Text size={200} className={styles.meta}>
                    {e.expaa_employeename} · {formatDate(e.expaa_expensedate)}
                  </Text>
                )}
                <div className={styles.badges}>
                  <Badge appearance="tint" color={statusColor(effectiveStatus)}>
                    {label(EXPENSE_STATUS, effectiveStatus)}
                  </Badge>
                  <Badge appearance="outline">{label(CATEGORIES, e.expaa_category)}</Badge>
                  <Badge
                    appearance="tint"
                    color={sla.breached ? 'danger' : decided ? 'success' : 'subtle'}
                  >
                    {decided
                      ? `Turnaround ${formatHours(sla.hours)}`
                      : sla.breached
                        ? 'SLA breached'
                        : `${formatHours(sla.hours)} waiting`}
                  </Badge>
                  {trailCount.get(e.expaa_expenseid) ? (
                    <Badge appearance="outline">
                      {trailCount.get(e.expaa_expenseid)} steps
                    </Badge>
                  ) : null}
                </div>
                {effectiveStatus === STATUS_APPROVED && !isReimbursed && (
                  <Button
                    className={styles.reimburse}
                    size="small"
                    icon={<Money24Regular />}
                    disabled={busyId === e.expaa_expenseid}
                    onClick={() => handleReimburse(e.expaa_expenseid)}
                  >
                    Mark reimbursed
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
