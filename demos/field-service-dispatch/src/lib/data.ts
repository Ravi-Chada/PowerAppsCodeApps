import { Fsd_ticketsService } from '../generated/services/Fsd_ticketsService';
import { Fsd_statuslogsService } from '../generated/services/Fsd_statuslogsService';
import type { Fsd_tickets, Fsd_ticketsBase } from '../generated/models/Fsd_ticketsModel';
import type { Fsd_statuslogs, Fsd_statuslogsBase } from '../generated/models/Fsd_statuslogsModel';
import {
  TICKET_STATUS,
  SLA_BY_URGENCY,
  STATUS_NEW,
  STATUS_ASSIGNED,
  STATUS_COMPLETED,
} from './dispatch';
import { computePriority } from './priority';

// System fields (ownerid, statecode, …) are auto-populated by Dataverse on create.
type NewTicketRecord = Omit<Fsd_ticketsBase, 'fsd_ticketid'>;
type NewStatusLogRecord = Omit<Fsd_statuslogsBase, 'fsd_statuslogid'>;

export type Ticket = Fsd_tickets;
export type StatusLog = Fsd_statuslogs;

const TICKET_SELECT = [
  'fsd_ticketid',
  'fsd_name',
  'fsd_customername',
  'fsd_customerphone',
  'fsd_address',
  'fsd_city',
  'fsd_latitude',
  'fsd_longitude',
  'fsd_description',
  'fsd_category',
  'fsd_urgency',
  'fsd_status',
  'fsd_priorityscore',
  'fsd_technicianname',
  'fsd_technicianemail',
  'fsd_scheduledfor',
  'fsd_reportedon',
  'fsd_assignedon',
  'fsd_completedon',
  'fsd_resolutionnotes',
  'fsd_slahours',
  'createdon',
];

const STATUS_LOG_SELECT = [
  'fsd_statuslogid',
  'fsd_name',
  'fsd_technicianname',
  'fsd_notes',
  'fsd_status',
  'fsd_loggedon',
  '_fsd_ticketid_value',
  'createdon',
];

export async function listTickets(): Promise<Ticket[]> {
  const result = await Fsd_ticketsService.getAll({
    select: TICKET_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load tickets');
  }
  return result.data ?? [];
}

export async function listStatusLogs(): Promise<StatusLog[]> {
  const result = await Fsd_statuslogsService.getAll({
    select: STATUS_LOG_SELECT,
    orderBy: ['createdon desc'],
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to load status history');
  }
  return result.data ?? [];
}

export interface NewTicketInput {
  title: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  category: number;
  urgency: number;
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const reportedOn = new Date().toISOString();
  // Geo-priority is computed up front so the dispatch queue is ordered from
  // the moment the ticket is logged.
  const priority = computePriority({
    urgency: input.urgency,
    latitude: input.latitude,
    longitude: input.longitude,
    reportedOn,
  });
  const record = {
    fsd_name: input.title,
    fsd_customername: input.customerName,
    fsd_customerphone: input.customerPhone,
    fsd_address: input.address,
    fsd_city: input.city,
    fsd_latitude: input.latitude,
    fsd_longitude: input.longitude,
    fsd_description: input.description,
    // Choice fields are stored as integers; cast numeric state to the generated literal union.
    fsd_category: input.category as never,
    fsd_urgency: input.urgency as never,
    fsd_status: STATUS_NEW as never,
    fsd_priorityscore: priority.score,
    fsd_reportedon: reportedOn,
    fsd_slahours: SLA_BY_URGENCY[input.urgency] ?? 48,
  } as unknown as NewTicketRecord;
  const result = await Fsd_ticketsService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to create ticket');
  }
  await createStatusLog({
    ticketId: result.data.fsd_ticketid,
    ticketTitle: input.title,
    status: STATUS_NEW,
    notes: `Ticket logged. Priority score ${priority.score} (${priority.band}).`,
  });
  return result.data;
}

export interface AssignInput {
  ticketId: string;
  ticketTitle: string;
  technicianName: string;
  technicianEmail?: string;
  scheduledFor?: string; // ISO
  priorityScore?: number;
}

export async function assignTicket(input: AssignInput): Promise<void> {
  const result = await Fsd_ticketsService.update(input.ticketId, {
    fsd_status: STATUS_ASSIGNED as never,
    fsd_technicianname: input.technicianName,
    fsd_technicianemail: input.technicianEmail,
    fsd_scheduledfor: input.scheduledFor,
    fsd_assignedon: new Date().toISOString(),
    ...(input.priorityScore !== undefined ? { fsd_priorityscore: input.priorityScore } : {}),
  });
  if (!result.success) {
    throw result.error ?? new Error('Failed to assign ticket');
  }
  await createStatusLog({
    ticketId: input.ticketId,
    ticketTitle: input.ticketTitle,
    status: STATUS_ASSIGNED,
    technicianName: input.technicianName,
    notes: input.scheduledFor
      ? `Assigned to ${input.technicianName}, scheduled.`
      : `Assigned to ${input.technicianName}.`,
  });
}

export interface StatusChangeInput {
  ticketId: string;
  ticketTitle: string;
  status: number;
  technicianName?: string;
  notes?: string;
  /** When the change actually happened (defaults to now). Used for offline replay. */
  occurredOn?: string;
}

export async function changeTicketStatus(input: StatusChangeInput): Promise<void> {
  const occurredOn = input.occurredOn ?? new Date().toISOString();
  const fields: Partial<Omit<Fsd_ticketsBase, 'fsd_ticketid'>> = {
    fsd_status: input.status as never,
  };
  if (input.technicianName) {
    fields.fsd_technicianname = input.technicianName;
  }
  if (input.status === STATUS_COMPLETED) {
    fields.fsd_completedon = occurredOn;
    if (input.notes) {
      fields.fsd_resolutionnotes = input.notes;
    }
  }
  const result = await Fsd_ticketsService.update(input.ticketId, fields);
  if (!result.success) {
    throw result.error ?? new Error('Failed to update ticket status');
  }
  await createStatusLog({
    ticketId: input.ticketId,
    ticketTitle: input.ticketTitle,
    status: input.status,
    technicianName: input.technicianName,
    notes: input.notes,
    loggedOn: occurredOn,
  });
}

interface NewStatusLogInput {
  ticketId: string;
  ticketTitle: string;
  status: number;
  technicianName?: string;
  notes?: string;
  loggedOn?: string;
}

async function createStatusLog(input: NewStatusLogInput): Promise<void> {
  const statusLabel = TICKET_STATUS[input.status] ?? 'Updated';
  const record = {
    fsd_name: `${input.ticketTitle} — ${statusLabel}`,
    fsd_technicianname: input.technicianName,
    fsd_notes: input.notes,
    fsd_status: input.status as never,
    fsd_loggedon: input.loggedOn ?? new Date().toISOString(),
    // Lookup fields are written with the @odata.bind syntax to the entity set.
    'fsd_ticketid@odata.bind': `/fsd_tickets(${input.ticketId})`,
  } as unknown as NewStatusLogRecord;
  const result = await Fsd_statuslogsService.create(record);
  if (!result.success) {
    throw result.error ?? new Error('Failed to record status history');
  }
}
