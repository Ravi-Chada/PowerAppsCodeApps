import { Expaa_expensesService } from '../generated/services/Expaa_expensesService';
import { Expaa_approvalsService } from '../generated/services/Expaa_approvalsService';
import type { Expaa_expenses, Expaa_expensesBase } from '../generated/models/Expaa_expensesModel';
import type { Expaa_approvals, Expaa_approvalsBase } from '../generated/models/Expaa_approvalsModel';
import { APPROVAL_ACTION } from './expense';

// System fields (ownerid, statecode, …) are auto-populated by Dataverse on create.
type NewExpenseRecord = Omit<Expaa_expensesBase, 'expaa_expenseid'>;
type NewApprovalRecord = Omit<Expaa_approvalsBase, 'expaa_approvalid'>;

export type Expense = Expaa_expenses;
export type Approval = Expaa_approvals;

// Status values shared across the app.
export const STATUS_SUBMITTED = 1;
export const STATUS_IN_REVIEW = 2;
export const STATUS_APPROVED = 3;
export const STATUS_REJECTED = 4;
export const STATUS_REIMBURSED = 5;

const EXPENSE_SELECT = [
  'expaa_expenseid',
  'expaa_name',
  'expaa_employeename',
  'expaa_employeeemail',
  'expaa_amount',
  'expaa_category',
  'expaa_paymentmethod',
  'expaa_merchant',
  'expaa_expensedate',
  'expaa_description',
  'expaa_receipturl',
  'expaa_status',
  'expaa_submittedon',
  'expaa_decisionon',
  'expaa_approvername',
  'expaa_decisionnotes',
  'expaa_policyflag',
  'expaa_policynotes',
  'createdon',
];

const APPROVAL_SELECT = [
  'expaa_approvalid',
  'expaa_name',
  'expaa_approvername',
  'expaa_notes',
  'expaa_action',
  'expaa_actionon',
  '_expaa_expenseid_value',
  'createdon',
];

export async function listExpenses(): Promise<Expense[]> {
  const result = await Expaa_expensesService.getAll({
    select: EXPENSE_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load expenses');
  }
  return result.data ?? [];
}

export async function listApprovals(): Promise<Approval[]> {
  const result = await Expaa_approvalsService.getAll({
    select: APPROVAL_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load approval history');
  }
  return result.data ?? [];
}

export interface NewExpenseInput {
  purpose: string;
  employeeName?: string;
  employeeEmail?: string;
  amount: number;
  category: number;
  paymentMethod: number;
  merchant?: string;
  expenseDate?: string; // ISO
  description?: string;
  receiptUrl?: string;
  policyFlag: boolean;
  policyNotes?: string;
}

export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const record = {
    expaa_name: input.purpose,
    expaa_employeename: input.employeeName,
    expaa_employeeemail: input.employeeEmail,
    expaa_amount: input.amount,
    // Choice fields are stored as integers; cast numeric state to the generated literal union.
    expaa_category: input.category as never,
    expaa_paymentmethod: input.paymentMethod as never,
    expaa_merchant: input.merchant,
    expaa_expensedate: input.expenseDate,
    expaa_description: input.description,
    expaa_receipturl: input.receiptUrl,
    expaa_status: STATUS_SUBMITTED as never,
    expaa_submittedon: new Date().toISOString(),
    expaa_policyflag: input.policyFlag,
    expaa_policynotes: input.policyNotes,
  } as unknown as NewExpenseRecord;
  const result = await Expaa_expensesService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to create expense');
  }
  // Record the submission in the audit trail.
  await createApproval({
    expenseId: result.data.expaa_expenseid,
    action: 1, // Submitted
    approverName: input.employeeName,
    notes: input.policyFlag ? input.policyNotes : undefined,
  });
  return result.data;
}

export interface DecisionInput {
  expenseId: string;
  approve: boolean;
  approverName?: string;
  notes?: string;
}

export async function decideExpense(input: DecisionInput): Promise<void> {
  const status = input.approve ? STATUS_APPROVED : STATUS_REJECTED;
  const decisionOn = new Date().toISOString();
  const result = await Expaa_expensesService.update(input.expenseId, {
    expaa_status: status as never,
    expaa_decisionon: decisionOn,
    expaa_approvername: input.approverName,
    expaa_decisionnotes: input.notes,
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update expense');
  }
  await createApproval({
    expenseId: input.expenseId,
    action: input.approve ? 2 : 3, // Approved / Rejected
    approverName: input.approverName,
    notes: input.notes,
  });
}

export async function markInReview(id: string, approverName?: string): Promise<void> {
  const result = await Expaa_expensesService.update(id, {
    expaa_status: STATUS_IN_REVIEW as never,
    expaa_approvername: approverName,
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update expense');
  }
}

export async function markReimbursed(id: string, approverName?: string): Promise<void> {
  const result = await Expaa_expensesService.update(id, {
    expaa_status: STATUS_REIMBURSED as never,
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update expense');
  }
  await createApproval({
    expenseId: id,
    action: 5, // Reimbursed
    approverName,
  });
}

interface NewApprovalInput {
  expenseId: string;
  action: number;
  approverName?: string;
  notes?: string;
}

async function createApproval(input: NewApprovalInput): Promise<void> {
  const actionLabel = APPROVAL_ACTION[input.action] ?? 'Action';
  const record = {
    expaa_name: `${actionLabel} by ${input.approverName ?? 'System'}`,
    expaa_approvername: input.approverName,
    expaa_notes: input.notes,
    expaa_action: input.action as never,
    expaa_actionon: new Date().toISOString(),
    // Lookup fields are written with the @odata.bind syntax to the entity set.
    'expaa_expenseid@odata.bind': `/expaa_expenses(${input.expenseId})`,
  } as unknown as NewApprovalRecord;
  const result = await Expaa_approvalsService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to record approval history');
  }
}
