import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnswerEditorTools from '../components/AnswerEditorTools';
import AuthModal from '../components/AuthModal';
import AttachmentGallery from '../components/AttachmentGallery';
import Layout from '../components/Layout';
import RichText from '../components/RichText';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { avatarBg } from '../utils/avatarColor';
import { prepareForumImage } from '../utils/forumImage';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function Icon({ name, size = 18 }) {
  const paths = {
    message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    search: "m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    image: "M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4ZM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01",
    x: "M18 6 6 18M6 6l12 12",
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ image, initials, name, online = false }) {
  return (
    <span
      className="avatar"
      title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}
    >
      {image ? <img alt="" src={image} /> : initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

function upsertConversation(list, conversation) {
  if (!conversation?.id) return list;
  const next = [conversation, ...list.filter((item) => item.id !== conversation.id)];
  return next.sort((first, second) => {
    const firstTime = first.lastMessage?.created_at || first.updated_at;
    const secondTime = second.lastMessage?.created_at || second.updated_at;
    return new Date(secondTime) - new Date(firstTime);
  });
}

function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }
  ).format(date);
}

function totalUnread(conversations) {
  return conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
}

function emitUnreadCount(conversations) {
  window.dispatchEvent(new CustomEvent('ximor:messages-unread', {
    detail: { count: totalUnread(conversations) },
  }));
}

export default function MessagesPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { user, token, authHeaders } = useAuth();
  const { t } = useLanguage();
  const [showAuth, setShowAuth] = useState(false);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [draftImages, setDraftImages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const draftRef = useRef(null);
  const draftImageInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const lastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return t('messages.noMessages');
    const sender = conversation.lastMessage.is_mine
      ? t('messages.youPrefix')
      : `${conversation.otherUser.name}: `;
    const text = conversation.lastMessage.body || (
      conversation.lastMessage.images?.length ? t('composer.image') : ''
    );
    return (
      <span className="message-preview">
        <b>{sender}</b>
        {text}
      </span>
    );
  };

  const loadContacts = useCallback(async (term = '') => {
    if (!token) return;
    try {
      const search = term.trim();
      const suffix = search ? `?q=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${BACKEND}/api/messages/users${suffix}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('contacts failed');
      const data = await response.json();
      setContacts(Array.isArray(data.users) ? data.users : []);
    } catch {
      setContacts([]);
    }
  }, [authHeaders, token]);

  const loadConversations = useCallback(async () => {
    if (!token) return [];
    const response = await fetch(`${BACKEND}/api/messages/conversations`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('conversations failed');
    const data = await response.json();
    const next = Array.isArray(data.conversations) ? data.conversations : [];
    setConversations(next);
    emitUnreadCount(next);
    setActiveConversationId((current) => (
      next.some((item) => item.id === current) ? current : next[0]?.id ?? null
    ));
    return next;
  }, [authHeaders, token]);

  const loadMessages = useCallback(async (conversationId, options = {}) => {
    if (!token || !conversationId) return;
    if (!options.silent) setMessagesLoading(true);
    try {
      const response = await fetch(`${BACKEND}/api/messages/conversations/${conversationId}/messages`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('messages failed');
      const data = await response.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      if (data.conversation) {
        setConversations((current) => {
          const updated = upsertConversation(current, data.conversation);
          emitUnreadCount(updated);
          return updated;
        });
      }
      setError('');
    } catch {
      if (!options.silent) setError(t('messages.loadError'));
    } finally {
      if (!options.silent) setMessagesLoading(false);
    }
  }, [authHeaders, t, token]);

  useEffect(() => {
    if (!token) {
      setContacts([]);
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      setLoading(false);
      emitUnreadCount([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    loadConversations()
      .catch(() => { if (active) setError(t('messages.loadError')); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [loadConversations, t, token]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setTimeout(() => loadContacts(query), 250);
    return () => window.clearTimeout(timer);
  }, [loadContacts, query, token]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(() => {
      loadConversations().catch(() => {});
      if (activeConversationId) {
        loadMessages(activeConversationId, { silent: true });
      }
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeConversationId, loadConversations, loadMessages, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeConversationId, messages.length]);

  const startConversation = async (contact) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setStartingId(contact.id);
    try {
      const response = await fetch(`${BACKEND}/api/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId: contact.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'conversation failed');
      setConversations((current) => {
        const updated = upsertConversation(current, data.conversation);
        emitUnreadCount(updated);
        return updated;
      });
      setActiveConversationId(data.conversation.id);
      setQuery('');
      setError('');
    } catch {
      setError(t('messages.startError'));
    } finally {
      setStartingId(null);
    }
  };

  const handleDraftImages = async (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 4 - draftImages.length));

    if (!files.length) return;

    const results = await Promise.allSettled(files.map(prepareForumImage));
    const images = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    setDraftImages((current) => [...current, ...images].slice(0, 4));
    event.target.value = '';
  };

  const removeDraftImage = (imageId) => {
    setDraftImages((current) => current.filter((image) => image.id !== imageId));
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if ((!body && draftImages.length === 0) || !activeConversationId || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${BACKEND}/api/messages/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ body, images: draftImages }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'message failed');
      setMessages((current) => (
        current.some((item) => item.id === data.message.id) ? current : [...current, data.message]
      ));
      if (data.conversation) {
        setConversations((current) => {
          const updated = upsertConversation(current, data.conversation);
          emitUnreadCount(updated);
          return updated;
        });
      }
      setDraft('');
      setDraftImages([]);
      setError('');
    } catch {
      setError(t('messages.sendError'));
    } finally {
      setSending(false);
    }
  };

  const submitMessage = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout
      theme={theme}
      onThemeToggle={onThemeToggle}
      onCompose={() => navigate('/chat')}
      query={query}
      onQuery={setQuery}
      searchPlaceholder={t('messages.searchUsers')}
    >
      <main className="messages-shell">
        {!user ? (
          <section className="messages-login">
            <div className="messages-login-icon">
              <Icon name="message" size={30} />
            </div>
            <h1>{t('messages.loginTitle')}</h1>
            <p>{t('messages.loginText')}</p>
            <button className="primary-button" type="button" onClick={() => setShowAuth(true)}>
              {t('messages.loginAction')}
            </button>
          </section>
        ) : (
          <>
            <aside className="messages-sidebar">
              <div className="messages-sidebar-head">
                <div>
                  <span className="eyebrow">{t('messages.eyebrow')}</span>
                  <h1>{t('messages.title')}</h1>
                </div>
                <span className="messages-live">{t('common.live')}</span>
              </div>

              <label className="messages-search">
                <Icon name="search" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('messages.searchUsers')}
                />
              </label>

              <section className="messages-panel">
                <div className="messages-panel-title">
                  <strong>{t('messages.conversations')}</strong>
                  <span>{conversations.length}</span>
                </div>
                {loading ? (
                  <div className="messages-small-empty">{t('common.loading')}</div>
                ) : conversations.length === 0 ? (
                  <div className="messages-small-empty">{t('messages.noConversations')}</div>
                ) : (
                  <div className="messages-list">
                    {conversations.map((conversation) => (
                      <button
                        className={`message-person ${conversation.id === activeConversationId ? 'is-active' : ''} ${conversation.unread_count > 0 ? 'is-unread' : ''}`}
                        key={conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                        type="button"
                      >
                        <Avatar
                          image={conversation.otherUser.avatar_url}
                          initials={conversation.otherUser.initials}
                          name={conversation.otherUser.name}
                          online={conversation.unread_count > 0}
                        />
                        <span className="message-person-main">
                          <strong>
                            <span className="message-person-name">{conversation.otherUser.name}</span>
                            {conversation.unread_count > 0 && (
                              <small className="messages-new-pill">{t('messages.newMessage')}</small>
                            )}
                          </strong>
                          {lastMessagePreview(conversation)}
                        </span>
                        <span className="message-person-meta">
                          <time>{formatTime(conversation.lastMessage?.created_at || conversation.updated_at)}</time>
                          {conversation.unread_count > 0 && <b>{conversation.unread_count}</b>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="messages-panel">
                <div className="messages-panel-title">
                  <strong>{t('messages.people')}</strong>
                  <span>{contacts.length}</span>
                </div>
                {contacts.length === 0 ? (
                  <div className="messages-small-empty">{t('messages.noUsers')}</div>
                ) : (
                  <div className="messages-list">
                    {contacts.map((contact) => (
                      <button
                        className="message-person"
                        disabled={startingId === contact.id}
                        key={contact.id}
                        onClick={() => startConversation(contact)}
                        type="button"
                      >
                        <Avatar image={contact.avatar_url} initials={contact.initials} name={contact.name} />
                        <span className="message-person-main">
                          <strong>{contact.name}</strong>
                          <span>@{contact.username} · {contact.role}</span>
                        </span>
                        <em>{t('messages.startChat')}</em>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>

            <section className="messages-thread">
              {activeConversation ? (
                <>
                  <header className="messages-thread-head">
                    <Avatar
                      image={activeConversation.otherUser.avatar_url}
                      initials={activeConversation.otherUser.initials}
                      name={activeConversation.otherUser.name}
                      online
                    />
                    <div>
                      <h2>{activeConversation.otherUser.name}</h2>
                      <span>@{activeConversation.otherUser.username} · {activeConversation.otherUser.role}</span>
                    </div>
                  </header>

                  {error && <div className="messages-error">{error}</div>}

                  <div className="messages-body">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="messages-empty">{t('common.loading')}</div>
                    ) : messages.length === 0 ? (
                      <div className="messages-empty">
                        <Icon name="message" size={28} />
                        <strong>{t('messages.emptyThread')}</strong>
                        <span>{t('messages.emptyThreadText')}</span>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <article
                          className={`chat-bubble ${message.is_mine ? 'is-mine' : 'is-theirs'}`}
                          key={message.id}
                        >
                          {message.body && (
                            <RichText className="chat-bubble-text" text={message.body} />
                          )}
                          <AttachmentGallery images={message.images || []} />
                          <time>{formatTime(message.created_at)}</time>
                        </article>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="messages-composer" onSubmit={submitMessage}>
                    <AnswerEditorTools
                      className="messages-editor-tools"
                      onChange={setDraft}
                      textareaRef={draftRef}
                      value={draft}
                    />
                    {draftImages.length > 0 && (
                      <div className="composer-editor-images messages-composer-images">
                        {draftImages.map((image) => (
                          <figure key={image.id}>
                            <img alt={image.name} src={image.src} />
                            <button
                              aria-label={t('composer.removeImage', { name: image.name })}
                              onClick={() => removeDraftImage(image.id)}
                              type="button"
                            >
                              <Icon name="x" size={14} />
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}
                    <div className="messages-composer-row">
                      <textarea
                        ref={draftRef}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleDraftKeyDown}
                        placeholder={t('messages.messagePlaceholder')}
                        rows={2}
                      />
                      <button className="primary-button" disabled={(!draft.trim() && draftImages.length === 0) || sending} type="submit">
                        <Icon name="send" size={17} />
                        {sending ? t('messages.sending') : t('messages.sendMessage')}
                      </button>
                    </div>
                    <div className="composer-editor-footer messages-composer-footer">
                      <input
                        accept="image/*"
                        multiple
                        onChange={handleDraftImages}
                        ref={draftImageInputRef}
                        type="file"
                      />
                      <button
                        className="composer-attach-button"
                        disabled={draftImages.length >= 4}
                        onClick={() => draftImageInputRef.current?.click()}
                        type="button"
                      >
                        <Icon name="image" size={17} />
                        {t('composer.image')}
                      </button>
                      <span>{draftImages.length}/4</span>
                    </div>
                  </form>
                </>
              ) : (
                <div className="messages-empty messages-empty--full">
                  <Icon name="users" size={30} />
                  <strong>{t('messages.selectConversation')}</strong>
                  <span>{t('messages.selectConversationText')}</span>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </Layout>
  );
}
