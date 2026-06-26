import { useState } from 'react';
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
  Text,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { Star24Filled, Star24Regular, Send24Regular } from '@fluentui/react-icons';
import { CHANNELS, THEMES, SENTIMENTS, choiceOptions } from '../lib/feedback';
import { createFeedback } from '../lib/data';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stars: {
    display: 'flex',
    gap: '4px',
  },
  starButton: {
    background: 'none',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    color: tokens.colorPaletteMarigoldForeground1,
    lineHeight: 0,
  },
  submit: {
    marginTop: '8px',
  },
});

interface SubmitScreenProps {
  onSubmitted: () => void;
}

export function SubmitScreen({ onSubmitted }: SubmitScreenProps) {
  const styles = useStyles();
  const [subject, setSubject] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [channel, setChannel] = useState<number>(1);
  const [theme, setTheme] = useState<number>(1);
  const [sentiment, setSentiment] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const channelOptions = choiceOptions(CHANNELS);
  const themeOptions = choiceOptions(THEMES);
  const sentimentOptions = choiceOptions(SENTIMENTS);

  const canSubmit = subject.trim().length > 0 && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setStatus('idle');
    try {
      await createFeedback({
        subject: subject.trim(),
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        feedbackText: feedbackText.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        channel,
        theme,
        sentiment,
      });
      setStatus('success');
      setSubject('');
      setCustomerName('');
      setCustomerEmail('');
      setFeedbackText('');
      setRating(0);
      setChannel(1);
      setTheme(1);
      setSentiment(2);
      onSubmitted();
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
            <MessageBarBody>Feedback submitted. Thank you!</MessageBarBody>
          </MessageBar>
        )}
        {status === 'error' && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMsg}</MessageBarBody>
          </MessageBar>
        )}

        <Field label="Subject" required>
          <Input
            value={subject}
            onChange={(_, d) => setSubject(d.value)}
            placeholder="Short summary of the feedback"
          />
        </Field>

        <Field label="Customer name">
          <Input value={customerName} onChange={(_, d) => setCustomerName(d.value)} />
        </Field>

        <Field label="Customer email">
          <Input
            type="email"
            value={customerEmail}
            onChange={(_, d) => setCustomerEmail(d.value)}
          />
        </Field>

        <Field label="Feedback">
          <Textarea
            value={feedbackText}
            onChange={(_, d) => setFeedbackText(d.value)}
            rows={4}
            placeholder="What did the customer say?"
          />
        </Field>

        <Field label="Rating">
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={styles.starButton}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n === rating ? 0 : n)}
              >
                {n <= rating ? <Star24Filled /> : <Star24Regular />}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Channel">
          <Dropdown
            value={CHANNELS[channel]}
            selectedOptions={[String(channel)]}
            onOptionSelect={(_, d) => d.optionValue && setChannel(Number(d.optionValue))}
          >
            {channelOptions.map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Theme">
          <Dropdown
            value={THEMES[theme]}
            selectedOptions={[String(theme)]}
            onOptionSelect={(_, d) => d.optionValue && setTheme(Number(d.optionValue))}
          >
            {themeOptions.map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <Field label="Sentiment">
          <Dropdown
            value={SENTIMENTS[sentiment]}
            selectedOptions={[String(sentiment)]}
            onOptionSelect={(_, d) => d.optionValue && setSentiment(Number(d.optionValue))}
          >
            {sentimentOptions.map((o) => (
              <Option key={o.value} value={String(o.value)}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <Button
          className={styles.submit}
          appearance="primary"
          size="large"
          icon={<Send24Regular />}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {saving ? 'Submitting…' : 'Submit feedback'}
        </Button>
        <Text size={200} align="center">
          Captured feedback is stored in Dataverse and available to your team.
        </Text>
      </div>
    </Card>
  );
}
