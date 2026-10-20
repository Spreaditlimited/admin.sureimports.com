'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ArrowLeft, MessageCircle, Plus, Send } from 'lucide-react';
import { createBrowserDraftId } from '@/lib/procurement/browserDraftId';
import styles from './support.module.css';
import SupportReports from './SupportReports';

type Conversation = {
  id: string;
  subject: string;
  status: string;
  brand: string;
  country: string | null;
  customerId: string;
  customerName?: string | null;
  ownerKind?: string;
  assignedTo: string | null;
  orderId?: string | null;
  unreadCount?: number;
};
type Message = {
  id: number;
  body: string;
  authorKind: string;
  authorName?: string | null;
  internal: boolean | number;
  createdAt: string;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentExpiresAt?: string | null;
};
const statusLabels: Record<string, string> = {
  OPEN: 'Waiting for support',
  WAITING_CUSTOMER: 'Waiting for your reply',
  RESOLVED: 'Resolved',
};
async function api(
  path: string,
  body?: unknown,
  method = 'POST',
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/support/${path}`, {
    signal,
    cache: 'no-store',
    ...(body !== undefined
      ? {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || 'Unable to load support. Please try again.');
  return data;
}
export default function SupportWorkspace({
  agent = false,
  canEdit = true,
  whatsappAction,
}: {
  agent?: boolean;
  canEdit?: boolean;
  whatsappAction?: ReactNode;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAssignment, setFilterAssignment] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [orders, setOrders] = useState<
    Array<{
      pidOrder: string;
      orderName: string | null;
      orderStatus: string | null;
    }>
  >([]);
  const [orderId, setOrderId] = useState('');
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileKey = useRef('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  const historyPosition = useRef<{ id: string | null; cursor: number }>({
    id: null,
    cursor: 0,
  });
  const messageList = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const lastRead = useRef<{ id: string | null; cursor: number }>({
    id: null,
    cursor: 0,
  });
  const active =
    currentConversation?.id === selected
      ? currentConversation
      : conversations.find((item) => item.id === selected);
  useEffect(() => {
    if (!agent) return;
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, agent]);
  useEffect(() => {
    if (!agent) return;
    const controller = new AbortController();
    void api('agents', undefined, 'GET', controller.signal)
      .then((data) => setAgents(data.agents))
      .catch(() => {});
    return () => controller.abort();
  }, [agent, revision]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversation = params.get('conversation');
    if (conversation && /^[a-f0-9]{32}$/.test(conversation))
      setSelected(conversation);
    if (agent) return;
    const controller = new AbortController();
    void api('orders', undefined, 'GET', controller.signal)
      .then((data) => {
        setOrders(data.orders);
        const reference = params.get('order');
        if (
          reference &&
          data.orders.some(
            (order: { pidOrder: string }) => order.pidOrder === reference,
          )
        ) {
          setOrderId(reference);
          setCreating(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [agent]);
  const refreshList = useCallback(
    async (signal?: AbortSignal) => {
      const filters = new URLSearchParams({
        q: query,
        status: filterStatus,
        assigned: filterAssignment,
        unread: String(unreadOnly),
        page: String(page),
      });
      const data = await api(
        agent ? `inbox?${filters}` : 'conversations',
        undefined,
        'GET',
        signal,
      );
      setConversations(data.conversations);
      setTotal(data.total || 0);
      setLoading(false);
    },
    [agent, query, filterStatus, filterAssignment, unreadOnly, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!document.hidden) {
          await refreshList(controller.signal);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 15000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [agent, refreshList, revision]);
  useEffect(() => {
    if (historyPosition.current.id !== selected) {
      historyPosition.current = { id: selected, cursor: 0 };
      followLatest.current = true;
      setMessages([]);
    }
    if (!selected) return;
    const controller = new AbortController();
    let cursor = historyPosition.current.cursor;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let delay = 5000;
      try {
        if (!document.hidden) {
          const data = await api(
            `conversations/${selected}?after=${cursor}`,
            undefined,
            'GET',
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setCurrentConversation(data.conversation);
          setConversations((items) =>
            items.map((item) =>
              item.id === selected ? data.conversation : item,
            ),
          );
          setMessages((items) => [
            ...items,
            ...data.messages.filter(
              (next: Message) => !items.some((item) => item.id === next.id),
            ),
          ]);
          if (data.messages.length) {
            cursor = data.messages[data.messages.length - 1].id;
            historyPosition.current.cursor = cursor;
          }
          if (
            agent &&
            cursor &&
            followLatest.current &&
            !document.hidden &&
            (lastRead.current.id !== selected ||
              lastRead.current.cursor < cursor)
          ) {
            await api(`conversations/${selected}/read`, { cursor });
            lastRead.current = { id: selected, cursor };
            setConversations((items) =>
              items.map((item) =>
                item.id === selected ? { ...item, unreadCount: 0 } : item,
              ),
            );
          }
          if (data.hasMore) delay = 250;
        }
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, delay);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [selected, revision, agent]);
  useEffect(() => {
    const element = messageList.current;
    if (element && followLatest.current)
      element.scrollTop = element.scrollHeight;
  }, [messages.length]);
  function choose(id: string | null, newConversation = false) {
    setSelected(id);
    setCurrentConversation(null);
    setCreating(newConversation);
    setDraft('');
    setFile(null);
    fileKey.current = '';
    setSubject('');
    setOrderId('');
    setInternal(false);
    setError('');
    pending.current = null;
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    const fingerprint = JSON.stringify([
      selected,
      subject.trim(),
      draft.trim(),
      internal,
      orderId,
    ]);
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: createBrowserDraftId() };
    setBusy(true);
    setError('');
    try {
      if (creating) {
        const result = await api('conversations', {
          requestKey: pending.current.key,
          subject: subject.trim(),
          body: draft.trim(),
          ...(orderId ? { orderId } : {}),
        });
        await refreshList();
        setSelected(result.id);
        setCreating(false);
      } else if (selected) {
        await api(`conversations/${selected}`, {
          requestKey: pending.current.key,
          body: draft.trim(),
          internal,
        });
      }
      setDraft('');
      pending.current = null;
      setRevision((value) => value + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sendFile() {
    if (!file || !selected || busy) return;
    setBusy(true);
    setError('');
    if (!fileKey.current) fileKey.current = createBrowserDraftId();
    try {
      const response = await fetch(
        `/api/support/conversations/${selected}/attachments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-file-name': encodeURIComponent(file.name),
            'x-request-key': fileKey.current,
            'x-internal-note': String(internal),
          },
          body: file,
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send file.');
      setFile(null);
      fileKey.current = '';
      if (fileInput.current) fileInput.current.value = '';
      setRevision((v) => v + 1);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(status: string) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api(`conversations/${selected}`, { status }, 'PATCH');
      setRevision((value) => value + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SURE IMPORTS SUPPORT</span>
          <h1>{agent ? 'Customer conversations' : 'How can we help?'}</h1>
          <p>
            {agent
              ? 'One place for customer questions and follow-ups.'
              : 'Keep your questions and our replies together, wherever you are.'}
          </p>
        </div>
        {!agent && (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => choose(null, true)}
          >
            <Plus size={18} />
            New conversation
          </button>
        )}
      </header>
      {agent && <SupportReports revision={revision} />}
      {agent && (
        <div className={styles.inboxFilters}>
          <label>
            Search conversations
            <input
              type="search"
              value={search}
              maxLength={120}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subject, customer ID or order reference"
            />
          </label>
          <label>
            Status
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Waiting for support</option>
              <option value="WAITING_CUSTOMER">Waiting for customer</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </label>
          <label>
            Assigned to
            <select
              value={filterAssignment}
              onChange={(e) => {
                setFilterAssignment(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Everyone</option>
              <option value="ME">Assigned to me</option>
              <option value="UNASSIGNED">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.unreadFilter}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />
            Unread only
          </label>
        </div>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          {error}{' '}
          <button
            onClick={() => {
              setError('');
              setRevision((v) => v + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div
        className={`${styles.shell} ${selected || creating ? styles.threadOpen : ''}`}
      >
        <aside className={styles.list} aria-label="Conversations">
          <h2>{agent ? 'Inbox' : 'Your conversations'}</h2>
          {loading ? (
            <p role="status">Loading conversations…</p>
          ) : !conversations.length ? (
            <p>
              {agent
                ? 'No conversations match these filters.'
                : 'No conversations yet. Start one whenever you need help.'}
            </p>
          ) : (
            conversations.map((item) => (
              <button
                key={item.id}
                disabled={busy}
                aria-current={selected === item.id ? 'true' : undefined}
                onClick={() => choose(item.id)}
              >
                <strong>{item.subject}</strong>
                {agent && (
                  <span>
                    {item.customerName ||
                      (item.ownerKind === 'GUEST' ? 'Guest' : 'Customer')}
                  </span>
                )}
                {agent && Boolean(item.unreadCount) && (
                  <span className={styles.unreadBadge}>
                    {item.unreadCount} unread
                  </span>
                )}
                <span>
                  {agent && item.status === 'WAITING_CUSTOMER'
                    ? 'Waiting for customer'
                    : statusLabels[item.status]}
                </span>
                {agent && (
                  <small>
                    {item.brand === 'SURE_IMPORTS'
                      ? 'Sure Imports'
                      : item.brand}{' '}
                    · {item.country || 'Country not supplied'}
                  </small>
                )}
              </button>
            ))
          )}
          {agent && (
            <div className={styles.pagination}>
              <span>
                {total} conversations · Page {page} of{' '}
                {Math.max(1, Math.ceil(total / 25))}
              </span>
              <div>
                <button
                  type="button"
                  disabled={busy || page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={busy || page * 25 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {!agent && conversations.length === 100 && (
            <p>Showing the 100 most recently updated conversations.</p>
          )}
        </aside>
        <section className={styles.thread} aria-label="Conversation">
          {!selected && !creating ? (
            <div className={styles.empty}>
              <MessageCircle size={36} />
              <h2>
                {agent
                  ? 'Choose a conversation'
                  : 'Support that stays with you'}
              </h2>
              <p>
                {agent
                  ? 'Read the history before replying. Internal notes stay within your team.'
                  : 'Start a conversation or open a previous one. You can return here to check for replies.'}
              </p>
            </div>
          ) : (
            <>
              <header className={styles.threadHeader}>
                <button
                  className={styles.back}
                  disabled={busy}
                  onClick={() => choose(null)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2>
                    {creating
                      ? 'Start a conversation'
                      : active?.subject || 'Conversation'}
                  </h2>
                  <p>
                    {agent
                      ? active?.customerName ||
                        (active?.ownerKind === 'GUEST' ? 'Guest' : 'Customer')
                      : 'Our team will reply here. You can leave this page and return later.'}
                  </p>
                </div>
                {agent && selected && (
                  <select
                    aria-label="Conversation status"
                    value={active?.status || 'OPEN'}
                    disabled={busy || !canEdit}
                    onChange={(event) => void changeStatus(event.target.value)}
                  >
                    <option value="OPEN">Open</option>
                    <option value="WAITING_CUSTOMER">
                      Waiting for customer
                    </option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                )}
              </header>
              {agent && selected && (
                <label className={styles.assignment}>
                  Assigned to
                  <select
                    aria-label="Assigned support admin"
                    value={active?.assignedTo || ''}
                    disabled={busy || !canEdit}
                    onChange={(event) => {
                      const assignedTo = event.target.value || null;
                      setBusy(true);
                      setError('');
                      void api(
                        `conversations/${selected}/assignment`,
                        { assignedTo },
                        'PATCH',
                      )
                        .then(() => {
                          setCurrentConversation((c) =>
                            c ? { ...c, assignedTo } : c,
                          );
                          setRevision((v) => v + 1);
                        })
                        .catch((error) => setError(error.message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {active?.assignedTo &&
                      !agents.some((a) => a.id === active.assignedTo) && (
                        <option value={active.assignedTo}>
                          Previously assigned admin
                        </option>
                      )}
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {active?.orderId && (
                <p className={styles.notice}>
                  Order reference: <strong>{active.orderId}</strong>
                </p>
              )}
              {!creating && (
                <div
                  ref={messageList}
                  onScroll={(event) => {
                    const element = event.currentTarget;
                    followLatest.current =
                      element.scrollHeight -
                        element.scrollTop -
                        element.clientHeight <
                      60;
                  }}
                  className={styles.messages}
                  role="log"
                  aria-label="Messages"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {!messages.length && <p>Loading messages…</p>}
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`${styles.message} ${message.internal ? styles.note : (agent ? message.authorKind === 'AGENT' : message.authorKind !== 'AGENT') ? styles.own : ''}`}
                    >
                      <div>
                        <strong>
                          {message.internal
                            ? `${message.authorName || 'Support'} · Internal note`
                            : message.authorKind === 'AGENT'
                              ? message.authorName || 'Support'
                              : agent
                                ? active?.customerName ||
                                  (active?.ownerKind === 'GUEST'
                                    ? 'Guest'
                                    : 'Customer')
                                : 'You'}
                        </strong>
                        <time dateTime={message.createdAt}>
                          {new Date(message.createdAt).toLocaleString(
                            undefined,
                            { dateStyle: 'short', timeStyle: 'short' },
                          )}
                        </time>
                      </div>
                      {message.attachmentName ? (
                        <div className={styles.attachment}>
                          {message.attachmentExpiresAt &&
                          new Date(message.attachmentExpiresAt).getTime() >
                            Date.now() ? (
                            <>
                              <a
                                href={`/api/support/conversations/${selected}/attachments/${message.id}`}
                                download
                              >
                                {message.attachmentName}
                              </a>
                              <small>
                                {Math.ceil(
                                  (message.attachmentSize || 0) / 1024,
                                )}{' '}
                                KB · Available until{' '}
                                {new Date(
                                  message.attachmentExpiresAt,
                                ).toLocaleDateString()}
                              </small>
                            </>
                          ) : (
                            <>
                              <span>{message.attachmentName}</span>
                              <small>Attachment expired</small>
                            </>
                          )}
                        </div>
                      ) : (
                        <p>{message.body}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {canEdit && (
                <form className={styles.composer} onSubmit={send}>
                  {creating && (
                    <label>
                      What can we help with?
                      <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        minLength={3}
                        maxLength={120}
                        required
                        disabled={busy}
                        placeholder="For example, a question about my shipment"
                      />
                    </label>
                  )}
                  {creating && !agent && orders.length > 0 && (
                    <label>
                      Related order (optional)
                      <select
                        value={orderId}
                        onChange={(event) => setOrderId(event.target.value)}
                        disabled={busy}
                      >
                        <option value="">General question</option>
                        {orders.map((order) => (
                          <option key={order.pidOrder} value={order.pidOrder}>
                            {order.orderName || order.pidOrder} ·{' '}
                            {order.orderStatus || 'Saved'}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {agent && (
                    <label className={styles.noteToggle}>
                      <input
                        type="checkbox"
                        checked={internal}
                        disabled={busy}
                        onChange={(event) => {
                          setInternal(event.target.checked);
                          fileKey.current = '';
                        }}
                      />
                      Internal note — visible only to the support team
                    </label>
                  )}
                  <label>
                    {internal ? 'Note' : 'Your message'}
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={3}
                      maxLength={4000}
                      required
                      disabled={busy}
                      placeholder={
                        internal
                          ? 'Add context for your team…'
                          : 'Tell us a little more…'
                      }
                    />
                  </label>
                  {!creating && (
                    <div className={styles.attachControl}>
                      <label>
                        Attach a photo or PDF
                        <input
                          ref={fileInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={busy}
                          onChange={(event) => {
                            const next = event.target.files?.[0] || null;
                            fileKey.current = '';
                            if (next && next.size > 3 * 1024 * 1024) {
                              setError('Choose a file smaller than 3 MB.');
                              event.target.value = '';
                              setFile(null);
                              return;
                            }
                            setFile(next);
                            setError('');
                          }}
                        />
                      </label>
                      <small>Up to 3 MB per file.</small>
                      {file && (
                        <div className={styles.fileActions}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setFile(null);
                              fileKey.current = '';
                              if (fileInput.current)
                                fileInput.current.value = '';
                            }}
                          >
                            Remove file
                          </button>
                          <button
                            type="button"
                            className={styles.primary}
                            disabled={busy}
                            onClick={() => void sendFile()}
                          >
                            {busy
                              ? 'Sending…'
                              : internal
                                ? 'Send private file'
                                : 'Send file'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {creating && (
                    <small>
                      You can attach photos and PDFs once this conversation is
                      started.
                    </small>
                  )}
                  <div className={styles.sendRow}>
                    <small>
                      {draft.length}/4000 · Please don’t share passwords or card
                      details.
                    </small>
                    <button
                      className={styles.primary}
                      type="submit"
                      disabled={busy || !draft.trim()}
                    >
                      <Send size={16} />
                      {busy
                        ? 'Sending…'
                        : internal
                          ? 'Save note'
                          : 'Send message'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
      {!agent && whatsappAction && (
        <footer className={styles.fallback}>
          Chat unavailable? {whatsappAction}
          <span>WhatsApp conversations are separate from this inbox.</span>
        </footer>
      )}
    </main>
  );
}
