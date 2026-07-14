import {
  CATEGORIES,
  CATEGORY_CAPS,
  RECEIPT_THRESHOLD,
  STALE_DAYS,
  formatCurrency,
} from './expense';

export type PolicySeverity = 'block' | 'warn';

export interface PolicyViolation {
  severity: PolicySeverity;
  message: string;
}

export interface PolicyResult {
  violations: PolicyViolation[];
  /** True when there are no blocking violations and the expense can be submitted. */
  canSubmit: boolean;
  /** True when any violation (block or warn) was raised. */
  flagged: boolean;
}

export interface PolicyInput {
  amount?: number;
  category?: number;
  expenseDate?: string; // ISO
  receiptUrl?: string;
  description?: string;
}

/**
 * Policy-aware rule check run before an expense is submitted.
 *
 * Blocking rules stop submission outright; warnings allow submission but flag
 * the expense so it is routed for extra scrutiny during approval. This keeps
 * all policy logic in one place so it can later be replaced by a Power Automate
 * flow or business-rules engine without touching the UI.
 */
export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const violations: PolicyViolation[] = [];
  const amount = input.amount ?? 0;

  // 1. Amount must be a positive value.
  if (amount <= 0) {
    violations.push({ severity: 'block', message: 'Amount must be greater than zero.' });
  }

  // 2. Receipt required above the threshold.
  if (amount > RECEIPT_THRESHOLD && !input.receiptUrl?.trim()) {
    violations.push({
      severity: 'block',
      message: `A receipt is required for amounts over ${formatCurrency(RECEIPT_THRESHOLD)}.`,
    });
  }

  // 3. Category spend cap — over the cap is allowed but flagged for review.
  if (input.category && CATEGORY_CAPS[input.category] !== undefined) {
    const cap = CATEGORY_CAPS[input.category];
    if (amount > cap) {
      violations.push({
        severity: 'warn',
        message: `${CATEGORIES[input.category]} over the ${formatCurrency(cap)} cap — needs manager review.`,
      });
    }
  }

  // 4. Stale expense — older than the allowed submission window.
  if (input.expenseDate) {
    const date = new Date(input.expenseDate).getTime();
    if (!Number.isNaN(date)) {
      const ageDays = (Date.now() - date) / (1000 * 60 * 60 * 24);
      if (ageDays > STALE_DAYS) {
        violations.push({
          severity: 'warn',
          message: `Expense is over ${STALE_DAYS} days old — confirm it is still reimbursable.`,
        });
      }
      if (date > Date.now() + 1000 * 60 * 60 * 24) {
        violations.push({
          severity: 'block',
          message: 'Expense date cannot be in the future.',
        });
      }
    }
  }

  // 5. Justification required for higher-value claims.
  if (amount >= 1000 && !input.description?.trim()) {
    violations.push({
      severity: 'warn',
      message: 'Add a justification for claims of $1,000 or more.',
    });
  }

  const canSubmit = !violations.some((v) => v.severity === 'block');
  return { violations, canSubmit, flagged: violations.length > 0 };
}
