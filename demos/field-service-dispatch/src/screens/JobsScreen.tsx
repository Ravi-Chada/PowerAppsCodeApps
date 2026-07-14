import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  Badge,
  Text,
  Button,
  Input,
  Field,
  Textarea,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import {
  CloudOff24Regular,
  CloudArrowUp24Regular,
  ArrowRight24Regular,
  CheckmarkCircle24Regular,
  Location16Regular,
} from '@fluentui/react-icons';
import type { Ticket } from '../lib/data';
import {
  CATEGORIES,
  URGENCIES,
  TICKET_STATUS,
  label,
  statusColor,
  urgencyColor,
  formatDateTime,
  STATUS_ASSIGNED,
  STATUS_ENROUTE,
  STATUS_ONSITE,
  STATUS_COMPLETED,
} from '../lib/dispatch';
import { changeTicketStatus } from '../lib/data';
import {
  useOnlineStatus,
  getQueue,
  enqueueUpdate,
  flushQueue,
  type QueuedUpdate,
} from '../lib/offline';

const TECH_KEY = 'fsd.techName';

// The next status a technician can advance an open job to.
const NEXT_STATUS: Record<number, number | undefined> = {
  [STATUS_ASSIGNED]: STATUS_ENROUTE,
  [STATUS_ENROUTE]: STATUS_ONSITE,
  [STATUS_ONSITE]: STATUS_COMPLETED,
};

const NEXT_LABEL: Record<number, string> = {
  [STATUS_ENROUTE]: 'Start travel (En Route)',
  [STATUS_ONSITE]: 'Arrive on site',
  [STATUS_COMPLETED]: 'Complete job',
};

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
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
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 8px',
    color: tokens.colorNeutralForeground3,
  },
});

interface JobsScreenProps {
  tickets: Ticket[];
  loading: boolean;
  onChanged: () => void;
}

export function JobsScreen({ tickets, loading, onChanged }: JobsScreenProps) {
  const styles = useStyles();
  const online = useOnlineStatus();
  const [techName, setTechName] = useState<string>(() => {
    try {
      return localStorage.getItem(TECH_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [queue, setQueue] = useState<QueuedUpdate[]>(() => getQueue());
  const [resolutionFor, setResolutionFor] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  // Optimistic local status overrides so the UI advances immediately, even offline.
  const [localStatus, setLocalStatus] = useState<Record<string, number>>({});

  function saveTech(name: string) {
    setTechName(name);
    try {
      localStorage.setItem(TECH_KEY, name);
    } catch {
      // ignore
    }
  }

  const applyQueued = useCallback(
    (u: QueuedUpdate) =>
      changeTicketStatus({
        ticketId: u.ticketId,
        ticketTitle: u.ticketTitle,
        status: u.status,
        technicianName: u.technicianName,
        notes: u.notes,
        occurredOn: u.occurredOn,
      }),
    [],
  );

  // Replay buffered updates whenever connectivity returns.
  useEffect(() => {
    if (!online || queue.length === 0) return;
    let cancelled = false;
    void (async () => {
      const flushed = await flushQueue(applyQueued);
      if (cancelled) return;
      setQueue(getQueue());
      if (flushed > 0) {
        onChanged();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online, queue.length, applyQueued, onChanged]);

  const myJobs = useMemo(() => {
    const open = tickets.filter((t) => {
      const status = localStatus[t.fsd_ticketid] ?? t.fsd_status ?? 0;
      return status >= STATUS_ASSIGNED && status < STATUS_COMPLETED;
    });
    const name = techName.trim().toLowerCase();
    const mine = name
      ? open.filter((t) => (t.fsd_technicianname ?? '').toLowerCase().includes(name))
      : open;
    return mine.sort(
      (a, b) =>
        new Date(a.fsd_scheduledfor ?? a.fsd_assignedon ?? 0).getTime() -
        new Date(b.fsd_scheduledfor ?? b.fsd_assignedon ?? 0).getTime(),
    );
  }, [tickets, techName, localStatus]);

  async function advance(ticket: Ticket, nextStatus: number, notes?: string) {
    setBusyId(ticket.fsd_ticketid);
    const payload = {
      ticketId: ticket.fsd_ticketid,
      ticketTitle: ticket.fsd_name ?? 'Ticket',
      status: nextStatus,
      technicianName: techName.trim() || ticket.fsd_technicianname || undefined,
      notes,
    };
    // Optimistically advance locally.
    setLocalStatus((prev) => ({ ...prev, [ticket.fsd_ticketid]: nextStatus }));
    try {
      if (online) {
        await changeTicketStatus(payload);
        onChanged();
      } else {
        // Buffer the update for replay when connectivity returns.
        enqueueUpdate(payload);
        setQueue(getQueue());
      }
    } catch {
      // On a live failure, still buffer so the update is not lost.
      enqueueUpdate(payload);
      setQueue(getQueue());
    } finally {
      setBusyId(null);
      setResolutionFor(null);
      setResolutionNotes('');
    }
  }

  if (loading) {
    return <Spinner label="Loading your jobs…" />;
  }

  return (
    <div className={styles.wrap}>
      {!online && (
        <MessageBar intent="warning" icon={<CloudOff24Regular />}>
          <MessageBarBody>
            <MessageBarTitle>Offline</MessageBarTitle>
            Updates are saved on this device and will sync automatically when you reconnect.
          </MessageBarBody>
        </MessageBar>
      )}
      {queue.length > 0 && (
        <MessageBar intent="info" icon={<CloudArrowUp24Regular />}>
          <MessageBarBody>
            {queue.length} update{queue.length === 1 ? '' : 's'} waiting to sync
            {online ? ' — syncing…' : ''}.
          </MessageBarBody>
        </MessageBar>
      )}

      <Field label="Your name (filters to your jobs)">
        <Input
          value={techName}
          onChange={(_, d) => saveTech(d.value)}
          placeholder="e.g. Jordan Banks"
        />
      </Field>

      {myJobs.length === 0 ? (
        <div className={styles.empty}>
          <Text>No open jobs assigned{techName.trim() ? ' to you' : ''}.</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {myJobs.map((t) => {
            const status = localStatus[t.fsd_ticketid] ?? t.fsd_status ?? STATUS_ASSIGNED;
            const next = NEXT_STATUS[status];
            const isResolving = resolutionFor === t.fsd_ticketid;
            return (
              <Card key={t.fsd_ticketid}>
                <div className={styles.itemHeader}>
                  <Text weight="semibold">{t.fsd_name || '(no title)'}</Text>
                  <Badge appearance="tint" color={statusColor(status)}>
                    {label(TICKET_STATUS, status)}
                  </Badge>
                </div>
                {(t.fsd_customername || t.fsd_city) && (
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
                  {t.fsd_scheduledfor && (
                    <Badge appearance="outline">{formatDateTime(t.fsd_scheduledfor)}</Badge>
                  )}
                </div>

                {t.fsd_description && (
                  <>
                    <Divider style={{ marginTop: 8 }} />
                    <Text size={200} style={{ marginTop: 8 }}>
                      {t.fsd_description}
                    </Text>
                  </>
                )}

                <div className={styles.actions}>
                  {next === STATUS_COMPLETED ? (
                    isResolving ? (
                      <>
                        <Field label="Resolution notes">
                          <Textarea
                            value={resolutionNotes}
                            onChange={(_, d) => setResolutionNotes(d.value)}
                            rows={2}
                            placeholder="What did you do to resolve it?"
                          />
                        </Field>
                        <Button
                          appearance="primary"
                          icon={<CheckmarkCircle24Regular />}
                          disabled={busyId === t.fsd_ticketid}
                          onClick={() => advance(t, STATUS_COMPLETED, resolutionNotes.trim() || undefined)}
                        >
                          Confirm completion
                        </Button>
                      </>
                    ) : (
                      <Button
                        appearance="primary"
                        icon={<CheckmarkCircle24Regular />}
                        onClick={() => {
                          setResolutionFor(t.fsd_ticketid);
                          setResolutionNotes('');
                        }}
                      >
                        Complete job
                      </Button>
                    )
                  ) : next ? (
                    <Button
                      appearance="primary"
                      icon={<ArrowRight24Regular />}
                      disabled={busyId === t.fsd_ticketid}
                      onClick={() => advance(t, next)}
                    >
                      {NEXT_LABEL[next]}
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
