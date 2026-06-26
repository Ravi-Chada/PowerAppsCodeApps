import { Crfaa_feedbacksService } from '../generated/services/Crfaa_feedbacksService';
import { Crfaa_actionitemsService } from '../generated/services/Crfaa_actionitemsService';
import type { Crfaa_feedbacks, Crfaa_feedbacksBase } from '../generated/models/Crfaa_feedbacksModel';
import type { Crfaa_actionitems, Crfaa_actionitemsBase } from '../generated/models/Crfaa_actionitemsModel';

// System fields (ownerid, statecode, …) are auto-populated by Dataverse on create.
type NewFeedbackRecord = Omit<Crfaa_feedbacksBase, 'crfaa_feedbackid'>;
type NewActionRecord = Omit<Crfaa_actionitemsBase, 'crfaa_actionitemid'>;

export type Feedback = Crfaa_feedbacks;
export type ActionItem = Crfaa_actionitems;

const FEEDBACK_SELECT = [
  'crfaa_feedbackid',
  'crfaa_name',
  'crfaa_customername',
  'crfaa_customeremail',
  'crfaa_feedbacktext',
  'crfaa_rating',
  'crfaa_channel',
  'crfaa_theme',
  'crfaa_sentiment',
  'crfaa_status',
  'crfaa_submittedon',
  'crfaa_suggestedresponse',
  'createdon',
];

const ACTION_SELECT = [
  'crfaa_actionitemid',
  'crfaa_name',
  'crfaa_description',
  'crfaa_assignedto',
  'crfaa_duedate',
  'crfaa_priority',
  'crfaa_status',
  '_crfaa_feedbackid_value',
  'createdon',
];

export async function listFeedback(): Promise<Feedback[]> {
  const result = await Crfaa_feedbacksService.getAll({
    select: FEEDBACK_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load feedback');
  }
  return result.data ?? [];
}

export async function listActionItems(): Promise<ActionItem[]> {
  const result = await Crfaa_actionitemsService.getAll({
    select: ACTION_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load action items');
  }
  return result.data ?? [];
}

export interface NewFeedbackInput {
  subject: string;
  customerName?: string;
  customerEmail?: string;
  feedbackText?: string;
  rating?: number;
  channel: number;
  theme: number;
  sentiment: number;
}

export async function createFeedback(input: NewFeedbackInput): Promise<Feedback> {
  const record = {
    crfaa_name: input.subject,
    crfaa_customername: input.customerName,
    crfaa_customeremail: input.customerEmail,
    crfaa_feedbacktext: input.feedbackText,
    crfaa_rating: input.rating,
    // Choice fields are stored as integers; cast numeric state to the generated literal union.
    crfaa_channel: input.channel as never,
    crfaa_theme: input.theme as never,
    crfaa_sentiment: input.sentiment as never,
    crfaa_status: 1 as never, // New
    crfaa_submittedon: new Date().toISOString(),
  } as unknown as NewFeedbackRecord;
  const result = await Crfaa_feedbacksService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to create feedback');
  }
  return result.data;
}

export async function updateFeedbackStatus(id: string, status: number): Promise<void> {
  const result = await Crfaa_feedbacksService.update(id, { crfaa_status: status as never });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update feedback');
  }
}

export async function updateFeedbackSuggestedResponse(id: string, text: string): Promise<void> {
  const result = await Crfaa_feedbacksService.update(id, { crfaa_suggestedresponse: text });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update suggested response');
  }
}

export interface NewActionItemInput {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string; // ISO
  priority: number;
  feedbackId: string;
}

export async function createActionItem(input: NewActionItemInput): Promise<ActionItem> {
  const record = {
    crfaa_name: input.title,
    crfaa_description: input.description,
    crfaa_assignedto: input.assignedTo,
    crfaa_duedate: input.dueDate,
    crfaa_priority: input.priority as never,
    crfaa_status: 1 as never, // Open
    // Lookup fields are written with the @odata.bind syntax to the entity set.
    'crfaa_feedbackid@odata.bind': `/crfaa_feedbacks(${input.feedbackId})`,
  } as unknown as NewActionRecord;
  const result = await Crfaa_actionitemsService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to create action item');
  }
  return result.data;
}

export async function updateActionStatus(id: string, status: number): Promise<void> {
  const result = await Crfaa_actionitemsService.update(id, { crfaa_status: status as never });
  if (!result.success) {
    throw result.error ?? new Error('Failed to update action item');
  }
}
