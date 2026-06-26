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
} from '@fluentui/react-components';
import type { Feedback, ActionItem } from '../lib/data';
import {
  ACTION_STATUS,
  PRIORITIES,
  choiceOptions,
  label,
  priorityColor,
  actionStatusColor,
  formatDate,
} from '../lib/feedback';
import { updateActionStatus } from '../lib/data';

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
  badges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
  statusPicker: {
    marginTop: '8px',
    maxWidth: '160px',
  },
});

interface ActionsScreenProps {
  actionItems: ActionItem[];
  feedback: Feedback[];
  loading: boolean;
  onChanged: () => void;
}

const ALL = 'all';

export function ActionsScreen({ actionItems, feedback, loading, onChanged }: ActionsScreenProps) {
  const styles = useStyles();
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);

  const feedbackName = useMemo(() => {
    const map = new Map<string, string>();
    feedback.forEach((f) => map.set(f.crfaa_feedbackid, f.crfaa_name || '(no subject)'));
    return map;
  }, [feedback]);

  const filtered = useMemo(
    () =>
      actionItems.filter(
        (a) => statusFilter === ALL || String(a.crfaa_status) === statusFilter,
      ),
    [actionItems, statusFilter],
  );

  async function handleStatusChange(id: string, status: number) {
    setBusyId(id);
    try {
      await updateActionStatus(id, status);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.filters}>
        <Field className={styles.filterField} label="Status">
          <Dropdown
            value={statusFilter === ALL ? 'All' : ACTION_STATUS[Number(statusFilter)]}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => d.optionValue && setStatusFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(ACTION_STATUS).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {loading ? (
        <Spinner label="Loading action items…" />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Text>No action items{statusFilter !== ALL ? ' with this status' : ' yet'}.</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((a) => (
            <Card key={a.crfaa_actionitemid}>
              <div className={styles.top}>
                <Text weight="semibold">{a.crfaa_name}</Text>
                <Badge appearance="tint" color={priorityColor(a.crfaa_priority)}>
                  {label(PRIORITIES, a.crfaa_priority)}
                </Badge>
              </div>
              {a._crfaa_feedbackid_value && (
                <Text size={200} className={styles.meta}>
                  From: {feedbackName.get(a._crfaa_feedbackid_value) ?? 'feedback'}
                </Text>
              )}
              <div className={styles.badges}>
                {a.crfaa_assignedto && <Badge appearance="outline">{a.crfaa_assignedto}</Badge>}
                {a.crfaa_duedate && (
                  <Badge appearance="outline">Due {formatDate(a.crfaa_duedate)}</Badge>
                )}
                <Badge appearance="tint" color={actionStatusColor(a.crfaa_status)}>
                  {label(ACTION_STATUS, a.crfaa_status)}
                </Badge>
              </div>
              <div className={styles.statusPicker}>
                <Dropdown
                  disabled={busyId === a.crfaa_actionitemid}
                  value={label(ACTION_STATUS, a.crfaa_status)}
                  selectedOptions={[String(a.crfaa_status ?? '')]}
                  onOptionSelect={(_, d) =>
                    d.optionValue &&
                    handleStatusChange(a.crfaa_actionitemid, Number(d.optionValue))
                  }
                >
                  {choiceOptions(ACTION_STATUS).map((o) => (
                    <Option key={o.value} value={String(o.value)}>
                      {o.label}
                    </Option>
                  ))}
                </Dropdown>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
