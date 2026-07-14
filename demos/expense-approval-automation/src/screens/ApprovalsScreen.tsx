import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Badge,
  Text,
  Button,
  Textarea,
  Input,
  Field,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  Warning16Filled,
} from '@fluentui/react-icons';
import type { Expense, Approval } from '../lib/data';
import {
  CATEGORIES,
  PAYMENT_METHODS,
  EXPENSE_STATUS,
  APPROVAL_ACTION,
  label,
  statusColor,
  actionColor,
  formatCurrency,
  formatDate,
  slaInfo,
  formatHours,
} from '../lib/expense';
import { decideExpense, STATUS_SUBMITTED, STATUS_IN_REVIEW } from '../lib/data';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemCard: {
    cursor: 'pointer',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
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
  flag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
  detail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 12px',
  },
  decisionRow: {
    display: 'flex',
    gap: '8px',
  },
  fill: {
    flex: 1,
  },
  trail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  trailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'center',
  },
});

interface ApprovalsScreenProps {
  expenses: Expense[];
  approvals: Approval[];
  loading: boolean;
  onChanged: () => void;
}

export function ApprovalsScreen({ expenses, approvals, loading, onChanged }: ApprovalsScreenProps) {
  const styles = useStyles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      expenses.filter(
        (e) => e.expaa_status === STATUS_SUBMITTED || e.expaa_status === STATUS_IN_REVIEW,
      ),
    [expenses],
  );

  const selected = selectedId
    ? expenses.find((e) => e.expaa_expenseid === selectedId)
    : null;

  if (selected) {
    return (
      <ExpenseDetail
        expense={selected}
        approvals={approvals.filter(
          (a) => a._expaa_expenseid_value === selected.expaa_expenseid,
        )}
        onBack={() => setSelectedId(null)}
        onChanged={onChanged}
      />
    );
  }

  if (loading) {
    return <Spinner label="Loading approvals…" />;
  }

  if (pending.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>No expenses awaiting approval. You're all caught up.</Text>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {pending.map((e) => {
        const sla = slaInfo(e.expaa_submittedon, e.expaa_decisionon, e.expaa_status);
        return (
          <Card
            key={e.expaa_expenseid}
            className={styles.itemCard}
            onClick={() => setSelectedId(e.expaa_expenseid)}
          >
            <div className={styles.itemHeader}>
              <Text weight="semibold">{e.expaa_name || '(no purpose)'}</Text>
              <Text className={styles.amount}>{formatCurrency(e.expaa_amount)}</Text>
            </div>
            {e.expaa_employeename && (
              <Text size={200} className={styles.meta}>
                {e.expaa_employeename}
              </Text>
            )}
            <div className={styles.badges}>
              <Badge appearance="tint" color={statusColor(e.expaa_status)}>
                {label(EXPENSE_STATUS, e.expaa_status)}
              </Badge>
              <Badge appearance="outline">{label(CATEGORIES, e.expaa_category)}</Badge>
              {e.expaa_policyflag && (
                <span className={styles.flag}>
                  <Warning16Filled />
                  <Text size={200}>Policy flag</Text>
                </span>
              )}
              <Badge appearance="tint" color={sla.breached ? 'danger' : 'subtle'}>
                {sla.breached ? 'SLA breached' : `${formatHours(sla.hours)} waiting`}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface ExpenseDetailProps {
  expense: Expense;
  approvals: Approval[];
  onBack: () => void;
  onChanged: () => void;
}

function ExpenseDetail({ expense, approvals, onBack, onChanged }: ExpenseDetailProps) {
  const styles = useStyles();
  const [approverName, setApproverName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function decide(approve: boolean) {
    if (approve === false && !notes.trim()) {
      setError('Please add a note explaining the rejection.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await decideExpense({
        expenseId: expense.expaa_expenseid,
        approve,
        approverName: approverName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onChanged();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  }

  const trail = [...approvals].sort(
    (a, b) =>
      new Date(a.expaa_actionon ?? a.createdon ?? 0).getTime() -
      new Date(b.expaa_actionon ?? b.createdon ?? 0).getTime(),
  );

  return (
    <div className={styles.detail}>
      <Button appearance="subtle" icon={<ChevronLeft24Regular />} onClick={onBack}>
        Back
      </Button>

      <Card>
        <div className={styles.itemHeader}>
          <Text weight="semibold" size={400}>
            {expense.expaa_name}
          </Text>
          <Text className={styles.amount} size={500}>
            {formatCurrency(expense.expaa_amount)}
          </Text>
        </div>
        <div className={styles.badges}>
          <Badge appearance="tint" color={statusColor(expense.expaa_status)}>
            {label(EXPENSE_STATUS, expense.expaa_status)}
          </Badge>
          <Badge appearance="outline">{label(CATEGORIES, expense.expaa_category)}</Badge>
          <Badge appearance="outline">{label(PAYMENT_METHODS, expense.expaa_paymentmethod)}</Badge>
        </div>

        <Divider />

        <div className={styles.detailGrid}>
          <Text size={200} className={styles.meta}>
            Employee
          </Text>
          <Text size={200}>{expense.expaa_employeename || '—'}</Text>
          <Text size={200} className={styles.meta}>
            Expense date
          </Text>
          <Text size={200}>{formatDate(expense.expaa_expensedate)}</Text>
          <Text size={200} className={styles.meta}>
            Submitted
          </Text>
          <Text size={200}>{formatDate(expense.expaa_submittedon)}</Text>
          <Text size={200} className={styles.meta}>
            Merchant
          </Text>
          <Text size={200}>{expense.expaa_merchant || '—'}</Text>
        </div>

        {expense.expaa_description && (
          <>
            <Divider />
            <Text size={200}>{expense.expaa_description}</Text>
          </>
        )}

        {expense.expaa_receipturl && (
          <Text size={200}>
            Receipt:{' '}
            <a href={expense.expaa_receipturl} target="_blank" rel="noreferrer">
              view
            </a>
          </Text>
        )}
      </Card>

      {expense.expaa_policyflag && (
        <MessageBar intent="warning" icon={<Warning16Filled />}>
          <MessageBarBody>
            {expense.expaa_policynotes
              ? expense.expaa_policynotes
              : 'This expense was flagged by policy checks.'}
          </MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <Text weight="semibold">Decision</Text>
        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        <Field label="Approver name">
          <Input value={approverName} onChange={(_, d) => setApproverName(d.value)} />
        </Field>
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(_, d) => setNotes(d.value)}
            rows={2}
            placeholder="Optional for approval, required for rejection"
          />
        </Field>
        <div className={styles.decisionRow}>
          <Button
            className={styles.fill}
            appearance="primary"
            icon={<Checkmark24Regular />}
            disabled={busy}
            onClick={() => decide(true)}
          >
            Approve
          </Button>
          <Button
            className={styles.fill}
            icon={<Dismiss24Regular />}
            disabled={busy}
            onClick={() => decide(false)}
          >
            Reject
          </Button>
        </div>
      </Card>

      <Card>
        <Text weight="semibold">Audit trail</Text>
        <div className={styles.trail}>
          {trail.length === 0 ? (
            <Text size={200} className={styles.meta}>
              No history yet.
            </Text>
          ) : (
            trail.map((a) => (
              <div key={a.expaa_approvalid} className={styles.trailRow}>
                <div>
                  <Badge appearance="tint" color={actionColor(a.expaa_action)}>
                    {label(APPROVAL_ACTION, a.expaa_action)}
                  </Badge>{' '}
                  <Text size={200}>{a.expaa_approvername || 'System'}</Text>
                  {a.expaa_notes && (
                    <Text size={200} className={styles.meta}>
                      {' '}
                      — {a.expaa_notes}
                    </Text>
                  )}
                </div>
                <Text size={200} className={styles.meta}>
                  {formatDate(a.expaa_actionon ?? a.createdon)}
                </Text>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
