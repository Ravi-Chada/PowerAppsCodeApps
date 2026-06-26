import type { BadgeProps } from '@fluentui/react-components';
import type {
  Crfaa_feedbackscrfaa_channel,
  Crfaa_feedbackscrfaa_sentiment,
  Crfaa_feedbackscrfaa_status,
  Crfaa_feedbackscrfaa_theme,
} from '../generated/models/Crfaa_feedbacksModel';
import type {
  Crfaa_actionitemscrfaa_priority,
  Crfaa_actionitemscrfaa_status,
} from '../generated/models/Crfaa_actionitemsModel';

// Dataverse choice fields store INTEGER values. These maps render labels.
export const CHANNELS: Record<number, string> = {
  1: 'Web',
  2: 'Email',
  3: 'Phone',
  4: 'In-Person',
  5: 'Social',
};

export const THEMES: Record<number, string> = {
  1: 'Product',
  2: 'Service',
  3: 'Pricing',
  4: 'Support',
  5: 'Documentation',
  6: 'Other',
};

export const SENTIMENTS: Record<number, string> = {
  1: 'Positive',
  2: 'Neutral',
  3: 'Negative',
};

export const FEEDBACK_STATUS: Record<number, string> = {
  1: 'New',
  2: 'In Review',
  3: 'Actioned',
  4: 'Closed',
};

export const PRIORITIES: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export const ACTION_STATUS: Record<number, string> = {
  1: 'Open',
  2: 'In Progress',
  3: 'Done',
};

export type ChoiceMap = Record<number, string>;

export function choiceOptions(map: ChoiceMap): { value: number; label: string }[] {
  return Object.entries(map).map(([k, v]) => ({ value: Number(k), label: v }));
}

export function label(map: ChoiceMap, value?: number): string {
  if (value === undefined || value === null) return '—';
  return map[value] ?? '—';
}

export function sentimentColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'success';
    case 2:
      return 'informative';
    case 3:
      return 'danger';
    default:
      return 'subtle';
  }
}

export function feedbackStatusColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'brand';
    case 2:
      return 'warning';
    case 3:
      return 'success';
    case 4:
      return 'subtle';
    default:
      return 'subtle';
  }
}

export function priorityColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 3:
      return 'danger';
    case 2:
      return 'warning';
    case 1:
      return 'informative';
    default:
      return 'subtle';
  }
}

export function actionStatusColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'brand';
    case 2:
      return 'warning';
    case 3:
      return 'success';
    default:
      return 'subtle';
  }
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Type aliases for casting numeric state into the generated literal-union choice types.
export type FeedbackChannel = Crfaa_feedbackscrfaa_channel;
export type FeedbackSentiment = Crfaa_feedbackscrfaa_sentiment;
export type FeedbackStatus = Crfaa_feedbackscrfaa_status;
export type FeedbackTheme = Crfaa_feedbackscrfaa_theme;
export type ActionPriority = Crfaa_actionitemscrfaa_priority;
export type ActionStatus = Crfaa_actionitemscrfaa_status;
