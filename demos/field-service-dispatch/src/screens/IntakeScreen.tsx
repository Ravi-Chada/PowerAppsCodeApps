import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Button,
  Card,
  Badge,
  Text,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { Send24Regular, Location24Regular } from '@fluentui/react-icons';
import { CATEGORIES, URGENCIES, choiceOptions } from '../lib/dispatch';
import { computePriority, bandColor } from '../lib/priority';
import { createTicket } from '../lib/data';

// A small set of known service locations so the demo can populate coordinates
// (which feed the geo-priority engine) without a map picker.
const LOCATIONS: Record<string, { label: string; city: string; lat: number; lon: number }> = {
  downtown: { label: 'Downtown Seattle', city: 'Seattle', lat: 47.6062, lon: -122.3321 },
  bellevue: { label: 'Bellevue', city: 'Bellevue', lat: 47.6101, lon: -122.2015 },
  redmond: { label: 'Redmond', city: 'Redmond', lat: 47.674, lon: -122.1215 },
  everett: { label: 'Everett', city: 'Everett', lat: 47.9789, lon: -122.2021 },
  tacoma: { label: 'Tacoma', city: 'Tacoma', lat: 47.2529, lon: -122.4443 },
  olympia: { label: 'Olympia', city: 'Olympia', lat: 47.0379, lon: -122.9007 },
};

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  rowItem: {
    flex: 1,
  },
  priorityCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  priorityTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  score: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1,
  },
  factors: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    color: tokens.colorNeutralForeground3,
  },
  submit: {
    marginTop: '4px',
  },
  note: {
    color: tokens.colorNeutralForeground3,
  },
});

interface IntakeScreenProps {
  onCreated: () => void;
}

export function IntakeScreen({ onCreated }: IntakeScreenProps) {
  const styles = useStyles();
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationKey, setLocationKey] = useState<string>('downtown');
  const [category, setCategory] = useState<number>(1);
  const [urgency, setUrgency] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const location = LOCATIONS[locationKey];

  // Geo-priority preview updates live as urgency / location change.
  const priority = useMemo(
    () =>
      computePriority({
        urgency,
        latitude: location?.lat,
        longitude: location?.lon,
        reportedOn: new Date().toISOString(),
      }),
    [urgency, location],
  );

  const categoryOptions = choiceOptions(CATEGORIES);
  const urgencyOptions = choiceOptions(URGENCIES);
  const locationOptions = Object.entries(LOCATIONS).map(([k, v]) => ({ key: k, label: v.label }));

  const canSubmit = title.trim().length > 0 && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setStatus('idle');
    try {
      await createTicket({
        title: title.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        address: address.trim() || undefined,
        city: location?.city,
        latitude: location?.lat,
        longitude: location?.lon,
        description: description.trim() || undefined,
        category,
        urgency,
      });
      setStatus('success');
      setTitle('');
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setLocationKey('downtown');
      setCategory(1);
      setUrgency(2);
      setDescription('');
      onCreated();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className={styles.form}>
        {status === 'success' && (
          <MessageBar intent="success">
            <MessageBarBody>Ticket logged and added to the dispatch board.</MessageBarBody>
          </MessageBar>
        )}
        {status === 'error' && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMsg}</MessageBarBody>
          </MessageBar>
        )}

        <Field label="Issue title" required>
          <Input
            value={title}
            onChange={(_, d) => setTitle(d.value)}
            placeholder="e.g. No heat — furnace not igniting"
          />
        </Field>

        <div className={styles.row}>
          <Field className={styles.rowItem} label="Customer name">
            <Input value={customerName} onChange={(_, d) => setCustomerName(d.value)} />
          </Field>
          <Field className={styles.rowItem} label="Customer phone">
            <Input value={customerPhone} onChange={(_, d) => setCustomerPhone(d.value)} />
          </Field>
        </div>

        <Field label="Service address">
          <Input
            value={address}
            onChange={(_, d) => setAddress(d.value)}
            placeholder="Street address"
            contentBefore={<Location24Regular />}
          />
        </Field>

        <div className={styles.row}>
          <Field className={styles.rowItem} label="Area">
            <Dropdown
              value={location?.label}
              selectedOptions={[locationKey]}
              onOptionSelect={(_, d) => d.optionValue && setLocationKey(d.optionValue)}
            >
              {locationOptions.map((o) => (
                <Option key={o.key} value={o.key}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field className={styles.rowItem} label="Category">
            <Dropdown
              value={CATEGORIES[category]}
              selectedOptions={[String(category)]}
              onOptionSelect={(_, d) => d.optionValue && setCategory(Number(d.optionValue))}
            >
              {categoryOptions.map((o) => (
                <Option key={o.value} value={String(o.value)}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>

        <Field label="Urgency">
          <Dropdown
            value={URGENCIES[urgency]}
            selectedOptions={[String(urgency)]}
            onOptionSelect={(_, d) => d.optionValue && setUrgency(Number(d.optionValue))}
          >
            {urgencyOptions.map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(_, d) => setDescription(d.value)}
            rows={3}
            placeholder="What's the problem? Any access notes?"
          />
        </Field>

        <Card appearance="filled-alternative" className={styles.priorityCard}>
          <div className={styles.priorityTop}>
            <div>
              <Text size={200} className={styles.note}>
                Dispatch priority (auto)
              </Text>
              <div className={styles.score}>{priority.score}</div>
            </div>
            <Badge appearance="filled" color={bandColor(priority.band)} size="large">
              {priority.band}
            </Badge>
          </div>
          <ul className={styles.factors}>
            {priority.factors.map((f, i) => (
              <li key={i}>
                <Text size={200}>{f}</Text>
              </li>
            ))}
          </ul>
        </Card>

        <Button
          className={styles.submit}
          appearance="primary"
          size="large"
          icon={<Send24Regular />}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {saving ? 'Logging…' : 'Log ticket'}
        </Button>
        <Text size={200} align="center" className={styles.note}>
          Priority is computed from urgency, distance to the depot, and SLA pressure.
        </Text>
      </div>
    </Card>
  );
}
