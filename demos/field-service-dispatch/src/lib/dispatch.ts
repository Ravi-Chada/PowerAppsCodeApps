import type { BadgeProps } from '@fluentui/react-components';
import type {
  Fsd_ticketsfsd_category,
  Fsd_ticketsfsd_urgency,
  Fsd_ticketsfsd_status,
} from '../generated/models/Fsd_ticketsModel';
import type { Fsd_statuslogsfsd_status } from '../generated/models/Fsd_statuslogsModel';

// Dataverse choice fields store INTEGER values. These maps render labels.
export const CATEGORIES: Record<number, string> = {
  1: 'HVAC',
  2: 'Electrical',
  3: 'Plumbing',
  4: 'Appliance',
  5: 'Network',
  6: 'General',
};

export const URGENCIES: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

export const TICKET_STATUS: Record<number, string> = {
  1: 'New',
  2: 'Assigned',
  3: 'En Route',
  4: 'On Site',
  5: 'Completed',
  6: 'Cancelled',
};

// Status numeric constants shared across the app.
export const STATUS_NEW = 1;
export const STATUS_ASSIGNED = 2;
export const STATUS_ENROUTE = 3;
export const STATUS_ONSITE = 4;
export const STATUS_COMPLETED = 5;
export const STATUS_CANCELLED = 6;

// Default SLA response targets per urgency, in hours.
export const SLA_BY_URGENCY: Record<number, number> = {
  1: 72, // Low
  2: 48, // Medium
  3: 24, // High
  4: 4, // Critical
};

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
    case STATUS_NEW:
      return 'brand';
    case STATUS_ASSIGNED:
      return 'informative';
    case STATUS_ENROUTE:
      return 'warning';
    case STATUS_ONSITE:
      return 'warning';
    case STATUS_COMPLETED:
      return 'success';
    case STATUS_CANCELLED:
      return 'danger';
    default:
      return 'subtle';
  }
}

export function urgencyColor(value?: number): BadgeProps['color'] {
  switch (value) {
    case 1:
      return 'subtle';
    case 2:
      return 'informative';
    case 3:
      return 'warning';
    case 4:
      return 'danger';
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

export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatHours(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export interface SlaInfo {
  /** True while the ticket is still open (not completed/cancelled). */
  open: boolean;
  /** Elapsed hours since the ticket was reported. */
  elapsedHours: number;
  /** SLA target hours for the ticket's urgency. */
  targetHours: number;
  /** True when an open ticket has exceeded its SLA target. */
  breached: boolean;
  /** Hours remaining before SLA breach (negative when already breached). */
  remainingHours: number;
}

/** Computes SLA timing for a ticket based on its reported time and urgency. */
export function slaInfo(reportedOn?: string, urgency?: number, status?: number): SlaInfo {
  const closed = status === STATUS_COMPLETED || status === STATUS_CANCELLED;
  const start = reportedOn ? new Date(reportedOn).getTime() : NaN;
  const target = SLA_BY_URGENCY[urgency ?? 2] ?? 48;
  if (Number.isNaN(start)) {
    return { open: !closed, elapsedHours: 0, targetHours: target, breached: false, remainingHours: target };
  }
  const elapsed = Math.max(0, (Date.now() - start) / (1000 * 60 * 60));
  return {
    open: !closed,
    elapsedHours: elapsed,
    targetHours: target,
    breached: !closed && elapsed > target,
    remainingHours: target - elapsed,
  };
}

// Type aliases for casting numeric state into the generated literal-union choice types.
export type TicketCategory = Fsd_ticketsfsd_category;
export type TicketUrgency = Fsd_ticketsfsd_urgency;
export type TicketStatus = Fsd_ticketsfsd_status;
export type LogStatus = Fsd_statuslogsfsd_status;
