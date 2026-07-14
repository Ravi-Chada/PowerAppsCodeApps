import type { BadgeProps } from '@fluentui/react-components';
import type {
  Expaa_expensesexpaa_category,
  Expaa_expensesexpaa_paymentmethod,
  Expaa_expensesexpaa_status,
} from '../generated/models/Expaa_expensesModel';
import type { Expaa_approvalsexpaa_action } from '../generated/models/Expaa_approvalsModel';

// Dataverse choice fields store INTEGER values. These maps render labels.
export const CATEGORIES: Record<number, string> = {
  1: 'Travel',
  2: 'Meals',
  3: 'Lodging',
  4: 'Supplies',
  5: 'Software',
  6: 'Training',
  7: 'Other',
};

export const PAYMENT_METHODS: Record<number, string> = {
  1: 'Personal Card',
  2: 'Corporate Card',
  3: 'Cash',
  4: 'Bank Transfer',
};

export const EXPENSE_STATUS: Record<number, string> = {
  1: 'Submitted',
  2: 'In Review',
  3: 'Approved',
  4: 'Rejected',
  5: 'Reimbursed',
};

export const APPROVAL_ACTION: Record<number, string> = {
  1: 'Submitted',
  2: 'Approved',
  3: 'Rejected',
  4: 'Returned',
  5: 'Reimbursed',
};

// Per-category policy caps (USD). Amounts above these are flagged for review.
export const CATEGORY_CAPS: Record<number, number> = {
  1: 1500, // Travel
  2: 75, // Meals (per claim)
  3: 350, // Lodging (per night)
  4: 500, // Supplies
  5: 2000, // Software
  6: 2500, // Training
  7: 250, // Other
};

// Approval SLA target in hours (3 business days ≈ 72h).
export const SLA_HOURS = 72;

// Receipts are required above this amount.
export const RECEIPT_THRESHOLD = 25;

// Expenses older than this many days are considered stale.
export const STALE_DAYS = 60;

export type ChoiceMap = Record<number, string>;

export function choiceOptions(map: ChoiceMap): { value: number; label: string }[] {
  return Object.entries(map).map(([k, v]) => ({ value: Number(k), label: v }));
}

export function label(map: ChoiceMap, value?: number): string {
  if (value === undefined || value === null) return '—';
  return map[value] ?? '—';
}

export function statusColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'brand'; // Submitted
    case 2:
      return 'warning'; // In Review
    case 3:
      return 'success'; // Approved
    case 4:
      return 'danger'; // Rejected
    case 5:
      return 'informative'; // Reimbursed
    default:
      return 'subtle';
  }
}

export function actionColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'brand';
    case 2:
      return 'success';
    case 3:
      return 'danger';
    case 4:
      return 'warning';
    case 5:
      return 'informative';
    default:
      return 'subtle';
  }
}

export function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export interface SlaInfo {
  /** True while the expense is still awaiting a decision. */
  pending: boolean;
  /** Elapsed hours (pending) or turnaround hours (decided). */
  hours: number;
  /** True when a pending request has exceeded the SLA target. */
  breached: boolean;
}

/**
 * Computes SLA timing for an expense. For pending requests this is the time
 * since submission; for decided requests it is the approval turnaround time.
 */
export function slaInfo(submittedOn?: string, decisionOn?: string, status?: number): SlaInfo {
  const start = submittedOn ? new Date(submittedOn).getTime() : NaN;
  const decided = status === 3 || status === 4 || status === 5;
  const end = decided && decisionOn ? new Date(decisionOn).getTime() : Date.now();
  if (Number.isNaN(start)) {
    return { pending: !decided, hours: 0, breached: false };
  }
  const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
  return {
    pending: !decided,
    hours,
    breached: !decided && hours > SLA_HOURS,
  };
}

export function formatHours(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

// Type aliases for casting numeric state into the generated literal-union choice types.
export type ExpenseCategory = Expaa_expensesexpaa_category;
export type ExpensePaymentMethod = Expaa_expensesexpaa_paymentmethod;
export type ExpenseStatus = Expaa_expensesexpaa_status;
export type ApprovalAction = Expaa_approvalsexpaa_action;
