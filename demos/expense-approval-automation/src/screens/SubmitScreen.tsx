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
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { Send24Regular, Warning24Regular } from '@fluentui/react-icons';
import { CATEGORIES, PAYMENT_METHODS, choiceOptions } from '../lib/expense';
import { evaluatePolicy } from '../lib/policy';
import { createExpense } from '../lib/data';

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
  policyList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  submit: {
    marginTop: '8px',
  },
  note: {
    color: tokens.colorNeutralForeground3,
  },
});

interface SubmitScreenProps {
  onSubmitted: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubmitScreen({ onSubmitted }: SubmitScreenProps) {
  const styles = useStyles();
  const [purpose, setPurpose] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<number>(1);
  const [merchant, setMerchant] = useState('');
  const [expenseDate, setExpenseDate] = useState<string>(todayIso());
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const amountNum = Number(amount);

  // Policy is evaluated live as the form changes so the user sees issues early.
  const policy = useMemo(
    () =>
      evaluatePolicy({
        amount: Number.isFinite(amountNum) ? amountNum : 0,
        category,
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
        receiptUrl,
        description,
      }),
    [amountNum, category, expenseDate, receiptUrl, description],
  );

  const categoryOptions = choiceOptions(CATEGORIES);
  const paymentOptions = choiceOptions(PAYMENT_METHODS);

  const canSubmit = purpose.trim().length > 0 && amount.trim().length > 0 && policy.canSubmit && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setStatus('idle');
    try {
      const policyNotes = policy.violations.map((v) => `[${v.severity}] ${v.message}`).join('\n');
      await createExpense({
        purpose: purpose.trim(),
        employeeName: employeeName.trim() || undefined,
        employeeEmail: employeeEmail.trim() || undefined,
        amount: amountNum,
        category,
        paymentMethod,
        merchant: merchant.trim() || undefined,
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
        description: description.trim() || undefined,
        receiptUrl: receiptUrl.trim() || undefined,
        policyFlag: policy.flagged,
        policyNotes: policy.flagged ? policyNotes : undefined,
      });
      setStatus('success');
      setPurpose('');
      setEmployeeName('');
      setEmployeeEmail('');
      setAmount('');
      setCategory(1);
      setPaymentMethod(1);
      setMerchant('');
      setExpenseDate(todayIso());
      setDescription('');
      setReceiptUrl('');
      onSubmitted();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const blocks = policy.violations.filter((v) => v.severity === 'block');
  const warns = policy.violations.filter((v) => v.severity === 'warn');
  const showPolicy = amount.trim().length > 0 && policy.violations.length > 0;

  return (
    <Card>
      <div className={styles.form}>
        {status === 'success' && (
          <MessageBar intent="success">
            <MessageBarBody>Expense submitted for approval.</MessageBarBody>
          </MessageBar>
        )}
        {status === 'error' && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMsg}</MessageBarBody>
          </MessageBar>
        )}

        {showPolicy && blocks.length > 0 && (
          <MessageBar intent="error" icon={<Warning24Regular />}>
            <MessageBarBody>
              <MessageBarTitle>Cannot submit yet</MessageBarTitle>
              <ul className={styles.policyList}>
                {blocks.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            </MessageBarBody>
          </MessageBar>
        )}
        {showPolicy && warns.length > 0 && (
          <MessageBar intent="warning" icon={<Warning24Regular />}>
            <MessageBarBody>
              <MessageBarTitle>Will be flagged for review</MessageBarTitle>
              <ul className={styles.policyList}>
                {warns.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            </MessageBarBody>
          </MessageBar>
        )}

        <Field label="Purpose" required>
          <Input
            value={purpose}
            onChange={(_, d) => setPurpose(d.value)}
            placeholder="e.g. Client dinner — Contoso renewal"
          />
        </Field>

        <div className={styles.row}>
          <Field className={styles.rowItem} label="Employee name">
            <Input value={employeeName} onChange={(_, d) => setEmployeeName(d.value)} />
          </Field>
          <Field className={styles.rowItem} label="Employee email">
            <Input
              type="email"
              value={employeeEmail}
              onChange={(_, d) => setEmployeeEmail(d.value)}
            />
          </Field>
        </div>

        <div className={styles.row}>
          <Field className={styles.rowItem} label="Amount (USD)" required>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(_, d) => setAmount(d.value)}
              contentBefore="$"
              placeholder="0.00"
            />
          </Field>
          <Field className={styles.rowItem} label="Expense date">
            <Input
              type="date"
              value={expenseDate}
              onChange={(_, d) => setExpenseDate(d.value)}
            />
          </Field>
        </div>

        <div className={styles.row}>
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
          <Field className={styles.rowItem} label="Payment method">
            <Dropdown
              value={PAYMENT_METHODS[paymentMethod]}
              selectedOptions={[String(paymentMethod)]}
              onOptionSelect={(_, d) => d.optionValue && setPaymentMethod(Number(d.optionValue))}
            >
              {paymentOptions.map((o) => (
                <Option key={o.value} value={String(o.value)}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>

        <Field label="Merchant">
          <Input value={merchant} onChange={(_, d) => setMerchant(d.value)} />
        </Field>

        <Field label="Receipt URL" hint="Link to the receipt image or PDF.">
          <Input
            value={receiptUrl}
            onChange={(_, d) => setReceiptUrl(d.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Description / justification">
          <Textarea
            value={description}
            onChange={(_, d) => setDescription(d.value)}
            rows={3}
            placeholder="Business reason for this expense"
          />
        </Field>

        <Button
          className={styles.submit}
          appearance="primary"
          size="large"
          icon={<Send24Regular />}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {saving ? 'Submitting…' : 'Submit expense'}
        </Button>
        <Text size={200} align="center" className={styles.note}>
          Policy checks run automatically before submission. Flagged expenses are routed for
          manager review.
        </Text>
      </div>
    </Card>
  );
}
