import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Badge,
  Text,
  Dropdown,
  Option,
  Field,
  Button,
  Input,
  Textarea,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  Add24Regular,
  Sparkle24Regular,
  Star16Filled,
} from '@fluentui/react-icons';
import type { Feedback, ActionItem } from '../lib/data';
import {
  THEMES,
  SENTIMENTS,
  FEEDBACK_STATUS,
  PRIORITIES,
  CHANNELS,
  choiceOptions,
  label,
  sentimentColor,
  feedbackStatusColor,
  priorityColor,
  actionStatusColor,
  ACTION_STATUS,
  formatDate,
} from '../lib/feedback';
import {
  createActionItem,
  updateFeedbackStatus,
  updateFeedbackSuggestedResponse,
} from '../lib/data';
import { draftResponse } from '../lib/assistant';

const useStyles = makeStyles({
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  filterField: {
    flex: '1 1 30%',
    minWidth: '100px',
  },
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
  badges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  rowBadges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 0',
  },
  actionTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'center',
  },
  rating: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    color: tokens.colorPaletteMarigoldForeground1,
  },
  newActionForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
});

interface ReviewScreenProps {
  feedback: Feedback[];
  actionItems: ActionItem[];
  loading: boolean;
  onChanged: () => void;
}

const ALL = 'all';

export function ReviewScreen({ feedback, actionItems, loading, onChanged }: ReviewScreenProps) {
  const styles = useStyles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [themeFilter, setThemeFilter] = useState<string>(ALL);
  const [sentimentFilter, setSentimentFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (themeFilter !== ALL && String(f.crfaa_theme) !== themeFilter) return false;
      if (sentimentFilter !== ALL && String(f.crfaa_sentiment) !== sentimentFilter) return false;
      if (statusFilter !== ALL && String(f.crfaa_status) !== statusFilter) return false;
      return true;
    });
  }, [feedback, themeFilter, sentimentFilter, statusFilter]);

  const selected = selectedId ? feedback.find((f) => f.crfaa_feedbackid === selectedId) : null;

  if (selected) {
    return (
      <FeedbackDetail
        feedback={selected}
        actionItems={actionItems.filter(
          (a) => a._crfaa_feedbackid_value === selected.crfaa_feedbackid,
        )}
        onBack={() => setSelectedId(null)}
        onChanged={onChanged}
      />
    );
  }

  return (
    <div>
      <div className={styles.filters}>
        <Field className={styles.filterField} label="Theme">
          <Dropdown
            value={themeFilter === ALL ? 'All' : THEMES[Number(themeFilter)]}
            selectedOptions={[themeFilter]}
            onOptionSelect={(_, d) => d.optionValue && setThemeFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(THEMES).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field className={styles.filterField} label="Sentiment">
          <Dropdown
            value={sentimentFilter === ALL ? 'All' : SENTIMENTS[Number(sentimentFilter)]}
            selectedOptions={[sentimentFilter]}
            onOptionSelect={(_, d) => d.optionValue && setSentimentFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(SENTIMENTS).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field className={styles.filterField} label="Status">
          <Dropdown
            value={statusFilter === ALL ? 'All' : FEEDBACK_STATUS[Number(statusFilter)]}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => d.optionValue && setStatusFilter(d.optionValue)}
          >
            <Option value={ALL}>All</Option>
            {choiceOptions(FEEDBACK_STATUS).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {loading ? (
        <Spinner label="Loading feedback…" />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Text>No feedback matches these filters.</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((f) => (
            <Card
              key={f.crfaa_feedbackid}
              className={styles.itemCard}
              onClick={() => setSelectedId(f.crfaa_feedbackid)}
            >
              <div className={styles.itemHeader}>
                <Text weight="semibold">{f.crfaa_name || '(no subject)'}</Text>
                {f.crfaa_rating ? (
                  <span className={styles.rating}>
                    <Star16Filled />
                    <Text size={200}>{f.crfaa_rating}</Text>
                  </span>
                ) : null}
              </div>
              {f.crfaa_customername && (
                <Text size={200} className={styles.meta}>
                  {f.crfaa_customername}
                </Text>
              )}
              <div className={styles.badges}>
                <Badge appearance="tint" color={feedbackStatusColor(f.crfaa_status)}>
                  {label(FEEDBACK_STATUS, f.crfaa_status)}
                </Badge>
                <Badge appearance="tint" color={sentimentColor(f.crfaa_sentiment)}>
                  {label(SENTIMENTS, f.crfaa_sentiment)}
                </Badge>
                <Badge appearance="outline">{label(THEMES, f.crfaa_theme)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface FeedbackDetailProps {
  feedback: Feedback;
  actionItems: ActionItem[];
  onBack: () => void;
  onChanged: () => void;
}

function FeedbackDetail({ feedback, actionItems, onBack, onChanged }: FeedbackDetailProps) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [draft, setDraft] = useState(feedback.crfaa_suggestedresponse ?? '');

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAction() {
    if (!title.trim()) return;
    await withBusy(async () => {
      await createActionItem({
        title: title.trim(),
        assignedTo: assignedTo.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
        feedbackId: feedback.crfaa_feedbackid,
      });
      setTitle('');
      setAssignedTo('');
      setDueDate('');
      setPriority(2);
      setShowActionForm(false);
    });
  }

  function handleGenerateDraft() {
    setDraft(draftResponse(feedback));
  }

  async function handleSaveDraft() {
    await withBusy(async () => {
      await updateFeedbackSuggestedResponse(feedback.crfaa_feedbackid, draft);
    });
  }

  return (
    <div className={styles.detailSection}>
      <Button appearance="subtle" icon={<ChevronLeft24Regular />} onClick={onBack}>
        Back to list
      </Button>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <Text size={500} weight="semibold">
          {feedback.crfaa_name || '(no subject)'}
        </Text>
        {feedback.crfaa_customername && (
          <Text size={300}>{feedback.crfaa_customername}</Text>
        )}
        {feedback.crfaa_customeremail && (
          <Text size={200} className={styles.meta}>
            {feedback.crfaa_customeremail}
          </Text>
        )}
        <div className={styles.rowBadges} style={{ marginTop: 8 }}>
          <Badge appearance="tint" color={sentimentColor(feedback.crfaa_sentiment)}>
            {label(SENTIMENTS, feedback.crfaa_sentiment)}
          </Badge>
          <Badge appearance="outline">{label(THEMES, feedback.crfaa_theme)}</Badge>
          <Badge appearance="outline">{label(CHANNELS, feedback.crfaa_channel)}</Badge>
          {feedback.crfaa_rating ? (
            <Badge appearance="outline" icon={<Star16Filled />}>
              {feedback.crfaa_rating}
            </Badge>
          ) : null}
        </div>
        {feedback.crfaa_feedbacktext && (
          <Text style={{ marginTop: 12 }}>{feedback.crfaa_feedbacktext}</Text>
        )}
        <Text size={200} className={styles.meta} style={{ marginTop: 8 }}>
          Submitted {formatDate(feedback.crfaa_submittedon || feedback.createdon)}
        </Text>
      </Card>

      <Card>
        <Field label="Status">
          <Dropdown
            disabled={busy}
            value={label(FEEDBACK_STATUS, feedback.crfaa_status)}
            selectedOptions={[String(feedback.crfaa_status ?? '')]}
            onOptionSelect={(_, d) =>
              d.optionValue &&
              withBusy(() =>
                updateFeedbackStatus(feedback.crfaa_feedbackid, Number(d.optionValue)),
              )
            }
          >
            {choiceOptions(FEEDBACK_STATUS).map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </Card>

      <Card>
        <div className={styles.actionTop}>
          <Text weight="semibold">Drafted response</Text>
          <Button
            size="small"
            appearance="secondary"
            icon={<Sparkle24Regular />}
            onClick={handleGenerateDraft}
          >
            Generate
          </Button>
        </div>
        <Textarea
          value={draft}
          onChange={(_, d) => setDraft(d.value)}
          rows={4}
          placeholder="Draft a response to send back to the customer…"
        />
        <Button
          appearance="primary"
          size="small"
          disabled={busy || !draft.trim()}
          onClick={handleSaveDraft}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        >
          Save response
        </Button>
      </Card>

      <Card>
        <div className={styles.actionTop}>
          <Text weight="semibold">Action items ({actionItems.length})</Text>
          <Button
            size="small"
            icon={<Add24Regular />}
            onClick={() => setShowActionForm((s) => !s)}
          >
            Add
          </Button>
        </div>

        {showActionForm && (
          <div className={styles.newActionForm}>
            <Field label="Title" required>
              <Input value={title} onChange={(_, d) => setTitle(d.value)} />
            </Field>
            <Field label="Assigned to">
              <Input value={assignedTo} onChange={(_, d) => setAssignedTo(d.value)} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={dueDate} onChange={(_, d) => setDueDate(d.value)} />
            </Field>
            <Field label="Priority">
              <Dropdown
                value={PRIORITIES[priority]}
                selectedOptions={[String(priority)]}
                onOptionSelect={(_, d) => d.optionValue && setPriority(Number(d.optionValue))}
              >
                {choiceOptions(PRIORITIES).map((o) => (
                  <Option key={o.value} value={String(o.value)}>
                    {o.label}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Button
              appearance="primary"
              size="small"
              disabled={busy || !title.trim()}
              onClick={handleAddAction}
            >
              Create action item
            </Button>
          </div>
        )}

        {actionItems.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {actionItems.map((a, i) => (
              <div key={a.crfaa_actionitemid}>
                {i > 0 && <Divider />}
                <div className={styles.actionRow}>
                  <div className={styles.actionTop}>
                    <Text weight="semibold">{a.crfaa_name}</Text>
                    <Badge appearance="tint" color={priorityColor(a.crfaa_priority)}>
                      {label(PRIORITIES, a.crfaa_priority)}
                    </Badge>
                  </div>
                  {a.crfaa_assignedto && (
                    <Text size={200} className={styles.meta}>
                      {a.crfaa_assignedto}
                      {a.crfaa_duedate ? ` · due ${formatDate(a.crfaa_duedate)}` : ''}
                    </Text>
                  )}
                  <Badge
                    appearance="outline"
                    color={actionStatusColor(a.crfaa_status)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {label(ACTION_STATUS, a.crfaa_status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
