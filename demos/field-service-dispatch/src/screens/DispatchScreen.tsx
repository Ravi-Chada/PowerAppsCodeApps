import { useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Badge,
  Text,
  Button,
  Input,
  Field,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  VehicleTruckProfile24Regular,
  Location16Regular,
} from '@fluentui/react-icons';
import type { Ticket, StatusLog } from '../lib/data';
import {
  CATEGORIES,
  URGENCIES,
  TICKET_STATUS,
  label,
  statusColor,
  urgencyColor,
  formatDateTime,
  slaInfo,
  formatHours,
  STATUS_NEW,
} from '../lib/dispatch';
import { computePriority, bandColor } from '../lib/priority';
import { assignTicket } from '../lib/data';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemCard: {
    cursor: 'pointer',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  scorePill: {
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  badges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '6px',
    alignItems: 'center',
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
  detail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 12px',
  },
  factors: {
    margin: 0,
    paddingLeft: '18px',
    color: tokens.colorNeutralForeground3,
  },
});

interface DispatchScreenProps {
  tickets: Ticket[];
  logs: StatusLog[];
  loading: boolean;
  onChanged: () => void;
}

export function DispatchScreen({ tickets, logs, loading, onChanged }: DispatchScreenProps) {
  const styles = useStyles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Unassigned queue, ordered by live geo-priority (highest first).
  const queue = useMemo(() => {
    return tickets
      .filter((t) => t.fsd_status === STATUS_NEW)
      .map((t) => ({
        ticket: t,
        priority: computePriority({
          urgency: t.fsd_urgency,
          latitude: t.fsd_latitude,
          longitude: t.fsd_longitude,
          reportedOn: t.fsd_reportedon ?? t.createdon,
        }),
      }))
      .sort((a, b) => b.priority.score - a.priority.score);
  }, [tickets]);

  const selected = selectedId ? tickets.find((t) => t.fsd_ticketid === selectedId) : null;

  if (selected) {
    return (
      <AssignDetail
        ticket={selected}
        logs={logs.filter((l) => l._fsd_ticketid_value === selected.fsd_ticketid)}
        onBack={() => setSelectedId(null)}
        onChanged={onChanged}
      />
    );
  }

  if (loading) {
    return <Spinner label="Loading dispatch board…" />;
  }

  if (queue.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>No unassigned tickets. The board is clear.</Text>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {queue.map(({ ticket: t, priority }) => {
        const sla = slaInfo(t.fsd_reportedon ?? t.createdon, t.fsd_urgency, t.fsd_status);
        return (
          <Card
            key={t.fsd_ticketid}
            className={styles.itemCard}
            onClick={() => setSelectedId(t.fsd_ticketid)}
          >
            <div className={styles.itemHeader}>
              <Text weight="semibold">{t.fsd_name || '(no title)'}</Text>
              <Badge appearance="filled" color={bandColor(priority.band)} className={styles.scorePill}>
                {priority.score}
              </Badge>
            </div>
            {t.fsd_customername && (
              <Text size={200} className={styles.meta}>
                <Location16Regular />
                {t.fsd_customername}
                {t.fsd_city ? ` · ${t.fsd_city}` : ''}
              </Text>
            )}
            <div className={styles.badges}>
              <Badge appearance="tint" color={urgencyColor(t.fsd_urgency)}>
                {label(URGENCIES, t.fsd_urgency)}
              </Badge>
              <Badge appearance="outline">{label(CATEGORIES, t.fsd_category)}</Badge>
              <Badge appearance="tint" color={sla.breached ? 'danger' : 'subtle'}>
                {sla.breached
                  ? 'SLA breached'
                  : `${formatHours(Math.max(0, sla.remainingHours))} to SLA`}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface AssignDetailProps {
  ticket: Ticket;
  logs: StatusLog[];
  onBack: () => void;
  onChanged: () => void;
}

function todayLocalDateTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function AssignDetail({ ticket, logs, onBack, onChanged }: AssignDetailProps) {
  const styles = useStyles();
  const [technicianName, setTechnicianName] = useState('');
  const [technicianEmail, setTechnicianEmail] = useState('');
  const [scheduledFor, setScheduledFor] = useState<string>(todayLocalDateTime());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const priority = computePriority({
    urgency: ticket.fsd_urgency,
    latitude: ticket.fsd_latitude,
    longitude: ticket.fsd_longitude,
    reportedOn: ticket.fsd_reportedon ?? ticket.createdon,
  });

  async function assign() {
    if (!technicianName.trim()) {
      setError('Enter the technician assigned to this job.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await assignTicket({
        ticketId: ticket.fsd_ticketid,
        ticketTitle: ticket.fsd_name ?? 'Ticket',
        technicianName: technicianName.trim(),
        technicianEmail: technicianEmail.trim() || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        priorityScore: priority.score,
      });
      onChanged();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  const trail = [...logs].sort(
    (a, b) =>
      new Date(a.fsd_loggedon ?? a.createdon ?? 0).getTime() -
      new Date(b.fsd_loggedon ?? b.createdon ?? 0).getTime(),
  );

  return (
    <div className={styles.detail}>
      <Button appearance="subtle" icon={<ChevronLeft24Regular />} onClick={onBack}>
        Back
      </Button>

      <Card>
        <div className={styles.itemHeader}>
          <Text weight="semibold" size={400}>
            {ticket.fsd_name}
          </Text>
          <Badge appearance="filled" color={bandColor(priority.band)} size="large">
            {priority.score} · {priority.band}
          </Badge>
        </div>
        <div className={styles.badges}>
          <Badge appearance="tint" color={statusColor(ticket.fsd_status)}>
            {label(TICKET_STATUS, ticket.fsd_status)}
          </Badge>
          <Badge appearance="tint" color={urgencyColor(ticket.fsd_urgency)}>
            {label(URGENCIES, ticket.fsd_urgency)}
          </Badge>
          <Badge appearance="outline">{label(CATEGORIES, ticket.fsd_category)}</Badge>
        </div>

        <Divider />

        <div className={styles.detailGrid}>
          <Text size={200} className={styles.meta}>
            Customer
          </Text>
          <Text size={200}>{ticket.fsd_customername || '—'}</Text>
          <Text size={200} className={styles.meta}>
            Phone
          </Text>
          <Text size={200}>{ticket.fsd_customerphone || '—'}</Text>
          <Text size={200} className={styles.meta}>
            Location
          </Text>
          <Text size={200}>
            {ticket.fsd_address ? `${ticket.fsd_address}, ` : ''}
            {ticket.fsd_city || '—'}
          </Text>
          <Text size={200} className={styles.meta}>
            Reported
          </Text>
          <Text size={200}>{formatDateTime(ticket.fsd_reportedon ?? ticket.createdon)}</Text>
        </div>

        {ticket.fsd_description && (
          <>
            <Divider />
            <Text size={200}>{ticket.fsd_description}</Text>
          </>
        )}

        <Divider />
        <Text size={200} weight="semibold">
          Why this priority
        </Text>
        <ul className={styles.factors}>
          {priority.factors.map((f, i) => (
            <li key={i}>
              <Text size={200}>{f}</Text>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Text weight="semibold">Assign technician</Text>
        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        <Field label="Technician name" required>
          <Input value={technicianName} onChange={(_, d) => setTechnicianName(d.value)} />
        </Field>
        <Field label="Technician email">
          <Input
            type="email"
            value={technicianEmail}
            onChange={(_, d) => setTechnicianEmail(d.value)}
          />
        </Field>
        <Field label="Scheduled for">
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(_, d) => setScheduledFor(d.value)}
          />
        </Field>
        <Button
          appearance="primary"
          icon={<VehicleTruckProfile24Regular />}
          disabled={busy}
          onClick={assign}
        >
          {busy ? 'Assigning…' : 'Assign & dispatch'}
        </Button>
      </Card>

      <Card>
        <Text weight="semibold">Status history</Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {trail.length === 0 ? (
            <Text size={200} className={styles.meta}>
              No history yet.
            </Text>
          ) : (
            trail.map((l) => (
              <div
                key={l.fsd_statuslogid}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
              >
                <div>
                  <Badge appearance="tint" color={statusColor(l.fsd_status)}>
                    {label(TICKET_STATUS, l.fsd_status)}
                  </Badge>{' '}
                  <Text size={200}>{l.fsd_technicianname || 'Dispatch'}</Text>
                  {l.fsd_notes && (
                    <Text size={200} className={styles.meta}>
                      {' '}
                      — {l.fsd_notes}
                    </Text>
                  )}
                </div>
                <Text size={200} className={styles.meta}>
                  {formatDateTime(l.fsd_loggedon ?? l.createdon)}
                </Text>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
