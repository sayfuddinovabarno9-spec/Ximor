import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useForumStream } from '../hooks/useForumStream';
import AnswerEditorTools from '../components/AnswerEditorTools';
import AuthModal from '../components/AuthModal';
import AttachmentGallery from '../components/AttachmentGallery';
import ImageDropZone, { useImageDropTarget } from '../components/ImageDropZone';
import Layout from '../components/Layout';
import RichText from '../components/RichText';
import { avatarBg } from '../utils/avatarColor';
import copyToClipboard from '../utils/copyToClipboard';
import { formatQuestionCreatedAt } from '../utils/dateTime';
import { mergeAnswerIntoList } from '../utils/forumAnswers';
import { prepareForumImages } from '../utils/forumImage';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const QUESTION_CATEGORIES = [
  { id: 'all', labelKey: 'forum.all' },
  { id: 'organik', labelKey: 'forum.organic' },
  { id: 'anorganik', labelKey: 'forum.inorganic' },
  { id: 'fizikaviy', labelKey: 'forum.physical' },
  { id: 'analitik', labelKey: 'forum.analytical' },
  { id: 'dtm', labelKey: 'nav.olympiads' },
];

function getAnswerCount(topic) {
  if (Array.isArray(topic?.answersList)) return topic.answersList.length;
  return Number(topic?.answers) || 0;
}

function getQuestionUrl(questionId) {
  return `${window.location.origin}/q/${questionId}`;
}

function getAnswerUrl(questionId, answerId) {
  return `${getQuestionUrl(questionId)}#answer-${answerId}`;
}

function mergeReplyIntoAnswers(answersList = [], answerId, reply) {
  if (!reply) return answersList;
  const clientId = reply.client_id;

  return answersList.map((answer) => {
    if (String(answer.id) !== String(answerId)) return answer;

    let matched = false;
    const replies = Array.isArray(answer.replies) ? answer.replies : [];
    const nextReplies = replies.map((item) => {
      const sameServerReply = String(item.id) === String(reply.id);
      const sameOptimisticReply = clientId != null && String(item.id) === String(clientId);
      if (!sameServerReply && !sameOptimisticReply) return item;
      matched = true;
      return { ...item, ...reply, id: reply.id };
    });

    return {
      ...answer,
      replies: matched ? nextReplies : [...replies, reply],
    };
  });
}

function Icon({ name, size=18 }) {
  const paths = {
    arrowLeft: "M19 12H5M12 5l-7 7 7 7",
    arrowUp:   "M12 19V5M5 12l7-7 7 7",
    arrowDown: "M12 5v14M19 12l-7 7-7-7",
    check:     "M20 6 9 17l-5-5",
    send:      "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
    message:   "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    bookmark:  "M6 4h12v17l-6-4-6 4V4Z",
    link:      "M9 17H7A5 5 0 0 1 7 7h3M15 7h2a5 5 0 1 1 0 10h-3M8 12h8",
    pin:       "M12 17v5M5 17h14M6 3h12l-2 8 3 3H5l3-3-2-8Z",
    clock:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
    edit:      "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z",
    eye:       "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    image:     "M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4ZM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01",
    thumbsUp:  "M7 10v11M15 5.9 14 10h5.7a2 2 0 0 1 2 2.4l-1.4 7a2 2 0 0 1-2 1.6H7M7 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3M15 5.9V3a2 2 0 0 0-2-2l-3 9",
    thumbsDown:"M17 14V3M9 18.1 10 14H4.3a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 5.7 3H17M17 14h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M9 18.1V21a2 2 0 0 0 2 2l3-9",
    trash:     "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6",
    x:         "M18 6 6 18M6 6l12 12",
  };
  return (
    <svg aria-hidden fill="none" height={size} stroke="currentColor"
         strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
         viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ image, initials, name, online=false }) {
  return (
    <span className={`avatar ${online ? 'is-online' : ''}`} title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {image ? <img alt="" src={image} /> : initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

function EditQuestionModal({ onClose, onSubmit, topic }) {
  const { t } = useLanguage();
  const summaryRef = useRef(null);
  const [mode, setMode] = useState('write');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({
    title: topic.title || '',
    summary: topic.summary || '',
    category: topic.category || 'organik',
    tags: Array.isArray(topic.tags) ? topic.tags.join(', ') : '',
    images: Array.isArray(topic.images) ? topic.images : [],
  }));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleImages = async (fileList) => {
    const images = await prepareForumImages(fileList, 4 - form.images.length);
    if (!images.length) return;

    setForm((current) => ({ ...current, images: [...current.images, ...images].slice(0, 4) }));
  };
  const editorDropTarget = useImageDropTarget({ count: form.images.length, onFiles: handleImages });

  const removeImage = (imageId) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((image) => image.id !== imageId),
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        aria-modal="true"
        className="composer-modal composer-modal--split question-edit-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        role="dialog"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t('question.editQuestion')}</span>
            <h2>{t('question.editQuestionTitle')}</h2>
          </div>
          <button aria-label={t('common.close')} className="icon-button" onClick={onClose} title={t('common.close')} type="button">
            <Icon name="x" size={19} />
          </button>
        </div>

        <div className="composer-tabs" role="tablist">
          <button
            aria-selected={mode === 'write'}
            className={mode === 'write' ? 'is-active' : ''}
            onClick={() => setMode('write')}
            role="tab"
            type="button"
          >
            {t('composer.write')}
          </button>
          <button
            aria-selected={mode === 'preview'}
            className={mode === 'preview' ? 'is-active' : ''}
            onClick={() => setMode('preview')}
            role="tab"
            type="button"
          >
            {t('composer.preview')}
          </button>
        </div>

        {mode === 'write' ? (
          <>
            <label>
              {t('composer.title')}
              <input
                onChange={(event) => update('title', event.target.value)}
                placeholder={t('composer.titlePlaceholder')}
                value={form.title}
              />
            </label>

            <div className="composer-live-split">
              <div className="composer-live-editor">
                <AnswerEditorTools onChange={(value) => update('summary', value)} textareaRef={summaryRef} value={form.summary} />

                <div className="composer-question-field">
                  <label htmlFor="question-edit-summary">{t('composer.questionText')}</label>
                  <div
                    className={`composer-question-editor ${editorDropTarget.isDragging ? 'is-dragging' : ''}`}
                    {...editorDropTarget.dropTargetProps}
                  >
                    <textarea
                      id="question-edit-summary"
                      onChange={(event) => update('summary', event.target.value)}
                      placeholder={t('composer.questionPlaceholder')}
                      ref={summaryRef}
                      rows={7}
                      value={form.summary}
                    />

                    {form.images.length > 0 && (
                      <div className="composer-editor-images">
                        {form.images.map((image) => (
                          <figure key={image.id}>
                            <img alt={image.name} src={image.src} />
                            <button
                              aria-label={t('composer.removeImage', { name: image.name })}
                              onClick={() => removeImage(image.id)}
                              type="button"
                            >
                              <Icon name="x" size={14} />
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}

                    <ImageDropZone
                      count={form.images.length}
                      onFiles={handleImages}
                      renderIcon={(size) => <Icon name="image" size={size} />}
                    />
                  </div>
                </div>

                <div className="composer-meta-grid">
                  <label>
                    {t('composer.category')}
                    <select onChange={(event) => update('category', event.target.value)} value={form.category}>
                      {QUESTION_CATEGORIES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {t(item.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {t('composer.tags')}
                    <input onChange={(event) => update('tags', event.target.value)} value={form.tags} />
                  </label>
                </div>
              </div>

              <aside className="composer-live-preview-pane">
                <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
                <div className="topic-meta">
                  <span>{t(QUESTION_CATEGORIES.find((item) => item.id === form.category)?.labelKey || 'forum.all')}</span>
                </div>
                <h3>{form.title || t('composer.emptyTitle')}</h3>
                <div className="question-content">
                  <RichText text={form.summary || t('composer.emptyPreview')} />
                  <AttachmentGallery images={form.images} size="large" />
                </div>
                <div className="tag-row">
                  {form.tags
                    .split(',')
                    .map((tag) => tag.trim().replace(/^#/, ''))
                    .filter(Boolean)
                    .slice(0, 10)
                    .map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="composer-preview">
            <div className="topic-meta">
              <span>{t(QUESTION_CATEGORIES.find((item) => item.id === form.category)?.labelKey || 'forum.all')}</span>
            </div>
            <h3>{form.title || t('composer.emptyTitle')}</h3>
            <div className="question-content">
              <RichText text={form.summary || t('composer.emptyPreview')} />
              <AttachmentGallery images={form.images} size="large" />
            </div>
            <div className="tag-row">
              {form.tags
                .split(',')
                .map((tag) => tag.trim().replace(/^#/, ''))
                .filter(Boolean)
                .slice(0, 10)
                .map((tag) => (
                  <span className="tag-chip" key={tag}>
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="soft-button" onClick={onClose} type="button">
            {t('composer.cancel')}
          </button>
          <button className="primary-button" disabled={!form.title.trim() || !form.summary.trim() || submitting} type="submit">
            {submitting ? t('question.savingQuestion') : <><Icon name="check" size={17} />{t('question.saveQuestion')}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function FocusedAnswerComposer({
  defaultKeyboardOpen = false,
  images,
  onChange,
  onClose,
  onImagesChange,
  onRemoveImage,
  onSubmit,
  submitting,
  user,
  value,
}) {
  const { t } = useLanguage();
  const textareaRef = useRef(null);
  const hasContent = Boolean(value.trim() || images.length);
  const answerDropTarget = useImageDropTarget({ count: images.length, onFiles: onImagesChange });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="focus-editor-backdrop" onClick={onClose}>
      <form
        aria-modal="true"
        className="focus-editor-shell"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
        role="dialog"
      >
        <div className="focus-editor-head">
          <div>
            <span className="eyebrow">{t('forum.writeAnswer')}</span>
            <div className="focus-editor-author">
              <Avatar image={user.avatar_url} initials={user.initials} name={user.name} online />
              <strong>{user.name}</strong>
            </div>
          </div>
          <button aria-label={t('common.close')} className="icon-button" onClick={onClose} title={t('common.close')} type="button">
            <Icon name="x" size={19} />
          </button>
        </div>

        <div className="focus-editor-grid">
          <section
            className={`focus-editor-write ${answerDropTarget.isDragging ? 'is-dragging' : ''}`}
            aria-label={t('forum.writeAnswer')}
            {...answerDropTarget.dropTargetProps}
          >
            <AnswerEditorTools
              className="focus-editor-tools"
              defaultKeyboardOpen={defaultKeyboardOpen}
              onChange={onChange}
              textareaRef={textareaRef}
              value={value}
            />

            <textarea
              id="focused-answer-editor"
              onChange={(event) => onChange(event.target.value)}
              placeholder={t('forum.answerPlaceholder')}
              ref={textareaRef}
              rows={12}
              value={value}
            />

            {images.length > 0 && (
              <div className="composer-editor-images">
                {images.map((image) => (
                  <figure key={image.id}>
                    <img alt={image.name} src={image.src} />
                    <button
                      aria-label={t('composer.removeImage', { name: image.name })}
                      onClick={() => onRemoveImage(image.id)}
                      type="button"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </figure>
                ))}
              </div>
            )}

            <ImageDropZone
              count={images.length}
              onFiles={onImagesChange}
              renderIcon={(size) => <Icon name="image" size={size} />}
            />
          </section>

          <aside className="focus-editor-preview" aria-label={t('composer.previewLabel')}>
            <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
            <div className={`focus-editor-preview-body ${hasContent ? '' : 'is-empty'}`.trim()}>
              <RichText className="qp-answer-text" text={value || t('composer.emptyPreview')} />
              <AttachmentGallery images={images} size="large" />
            </div>
          </aside>
        </div>

        <div className="focus-editor-actions">
          <button className="soft-button" onClick={onClose} type="button">
            {t('composer.cancel')}
          </button>
          <button className="primary-button" disabled={!hasContent || submitting} type="submit">
            <Icon name="send" size={16} />
            {submitting ? t('forum.sending') : t('forum.sendAnswer')}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── QuestionPage ──────────────────────────────────────────────────────────── */
export default function QuestionPage() {
  const { id }              = useParams();
  const location            = useLocation();
  const navigate            = useNavigate();
  const { user, authHeaders } = useAuth();
  const { language, t } = useLanguage();

  // Theme must be first — before any early returns
  const [theme, setTheme]   = useState(() => localStorage.getItem('ximor_theme') || 'light');
  const toggleTheme = () => setTheme(t => {
    const next = t === 'light' ? 'dark' : 'light';
    localStorage.setItem('ximor_theme', next);
    return next;
  });

  const [topic, setTopic]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [answer, setAnswer]     = useState('');
  const [answerImages, setAnswerImages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyBusy, setReplyBusy] = useState({});
  const [busy, setBusy]         = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [voted, setVoted]       = useState(0);          // current user's vote on the topic
  const [answerVotes, setAnswerVotes] = useState({});   // { [answerId]: 1 | -1 | 0 }
  const [showAuth, setShowAuth] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [focusedAnswerOpen, setFocusedAnswerOpen] = useState(false);
  const [focusedAnswerKeyboardOpen, setFocusedAnswerKeyboardOpen] = useState(false);
  const [toast, setToast]       = useState('');
  const [copiedPermalink, setCopiedPermalink] = useState('');
  const [highlightAnswerId, setHighlightAnswerId] = useState('');
  const toastRef                = useRef(null);
  const answerRef               = useRef(null);
  const copiedTimerRef          = useRef(null);
  const highlightTimerRef       = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  const hasPermission = useCallback((permissionKey) => {
    if (user?.is_admin) return true;
    if (!user?.is_moderator) return false;
    return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
  }, [user?.is_admin, user?.is_moderator, user?.permissions]);

  const openFocusedAnswer = useCallback((withKeyboard = false) => {
    setFocusedAnswerKeyboardOpen(Boolean(withKeyboard));
    setFocusedAnswerOpen(true);
  }, []);

  const closeFocusedAnswer = useCallback(() => {
    setFocusedAnswerOpen(false);
  }, []);

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(getQuestionUrl(id));
      setCopiedPermalink('question');
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedPermalink(''), 1800);
      showToast(t('question.questionLinkCopied'));
    } catch {
      showToast(t('question.copyFailed'));
    }
  };

  const handleCopyAnswerLink = async (answerId) => {
    try {
      await copyToClipboard(getAnswerUrl(id, answerId));
      setCopiedPermalink(`answer-${answerId}`);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedPermalink(''), 1800);
      showToast(t('question.answerLinkCopied'));
    } catch {
      showToast(t('question.copyFailed'));
    }
  };

  const handleAnswerImages = async (fileList) => {
    const images = await prepareForumImages(fileList, 4 - answerImages.length);
    if (!images.length) return;

    setAnswerImages((current) => [...current, ...images].slice(0, 4));
  };
  const answerDropTarget = useImageDropTarget({ count: answerImages.length, onFiles: handleAnswerImages });

  const removeAnswerImage = (imageId) => {
    setAnswerImages((current) => current.filter((image) => image.id !== imageId));
  };

  /* Fetch topic on mount */
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/forum/topics/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Topilmadi'))
      .then(data => { setTopic({ ...data, answers: getAnswerCount(data) }); setLoading(false); })
      .catch(e  => { setError(String(e)); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!topic?.answersList?.length || !location.hash.startsWith('#answer-')) return;

    const answerId = decodeURIComponent(location.hash.replace('#answer-', ''));
    const target = document.getElementById(`answer-${answerId}`);
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightAnswerId(answerId);
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightAnswerId(''), 2600);
    });
  }, [location.hash, topic?.answersList?.length]);

  /* Hydrate per-user vote state after login or topic change */
  useEffect(() => {
    if (!user) {
      setVoted(0);
      setAnswerVotes({});
      return;
    }
    const headers = authHeaders();
    Promise.all([
      fetch(`${API}/api/forum/my-votes`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API}/api/forum/my-answer-votes`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([topicVotes, ansVotes]) => {
      setVoted(topicVotes[Number(id)] ?? 0);
      setAnswerVotes(ansVotes);
    });
  }, [user?.id, id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* SSE — live updates for this specific topic */
  const onAnswer = useCallback(({ topicId, answer: a, answers }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => {
      if (!prev) return prev;
      const answersList = mergeAnswerIntoList(prev.answersList, a);
      return { ...prev, answers: answers ?? answersList.length, answersList };
    });
  }, [id]);

  const onVote = useCallback(({ topicId, score }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? { ...prev, score } : prev);
  }, [id]);

  const onAccept = useCallback(({ topicId, answerId, solved = true, moderation_correctness }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev, solved,
      answersList: prev.answersList.map(a => (
        a.id === answerId
          ? { ...a, accepted: true, moderation_correctness: moderation_correctness ?? a.moderation_correctness }
          : { ...a, accepted: false }
      )),
    } : prev);
  }, [id]);

  const onTopicModeration = useCallback(({ topicId, solved }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev,
      solved,
      answersList: solved ? prev.answersList : prev.answersList.map(a => ({ ...a, accepted: false })),
    } : prev);
  }, [id]);

  const onTopicUpdate = useCallback((updated) => {
    if (String(updated.id) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev,
      ...updated,
      answersList: prev.answersList,
      answers: updated.answers ?? prev.answers,
    } : prev);
  }, [id]);

  // Live answer-score updates from other clients
  const onAnswerVoteSSE = useCallback(({ answerId, score }) => {
    setTopic(prev => prev ? {
      ...prev,
      answersList: prev.answersList.map(a => a.id === answerId ? { ...a, score } : a),
    } : prev);
  }, []);

  const onAnswerModeration = useCallback(({ topicId, answerId, accepted, topic_solved, moderation_helpfulness, moderation_correctness }) => {
    setTopic(prev => {
      if (!prev) return prev;
      if (topicId != null && String(topicId) !== String(id)) return prev;
      return {
        ...prev,
        solved: topic_solved ?? prev.solved,
        answersList: prev.answersList.map(a => (
          a.id === answerId
            ? {
                ...a,
                accepted: accepted ?? a.accepted,
                moderation_helpfulness,
                moderation_correctness,
              }
            : a
        )),
      };
    });
  }, [id]);

  const onAnswerDeleted = useCallback(({ topicId, answerId, answers, solved }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.filter(a => a.id !== answerId);
      return {
        ...prev,
        answers: answersList.length,
        solved,
        answersList,
      };
    });
  }, [id]);

  const onAnswerReply = useCallback(({ topicId, answerId, reply }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev,
      answersList: mergeReplyIntoAnswers(prev.answersList, answerId, reply),
    } : prev);
  }, [id]);

  const onTopicDeleted = useCallback(({ topicId }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(null);
    setError(t('question.notFound'));
  }, [id, t]);

  useForumStream(
    () => {},
    null,
    onAnswer,
    onVote,
    onAccept,
    onAnswerVoteSSE,
    onTopicModeration,
    onAnswerModeration,
    onAnswerDeleted,
    onTopicUpdate,
    onTopicDeleted,
    onAnswerReply
  );

  /* Vote on the topic */
  const handleVote = async (direction) => {
    if (!user) { setShowAuth(true); return; }
    if (votePending) return;

    // Snapshot for revert
    const prevVoted = voted;
    const prevScore = topic?.score ?? 0;
    // Optimistic
    const toggling = voted === direction;
    setVoted(toggling ? 0 : direction);
    setTopic(prev => prev ? {
      ...prev,
      score: prev.score + (toggling ? -direction : direction - voted),
    } : prev);
    setVotePending(true);

    try {
      const response = await fetch(`${API}/api/forum/topics/${id}/vote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ direction }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'vote failed');

      const serverScore = Number(result.score);
      const serverVoted = Number(result.voted);
      if (!Number.isFinite(serverScore) || ![-1, 0, 1].includes(serverVoted)) {
        throw new Error('invalid vote response');
      }

      setVoted(serverVoted);
      setTopic(prev => prev ? { ...prev, score: serverScore } : prev);
      showToast(serverVoted === 0 ? t('forum.voteRemoved') : t('forum.voteSaved'));
    } catch {
      setVoted(prevVoted);
      setTopic(prev => prev ? { ...prev, score: prevScore } : prev);
      showToast(t('forum.voteFailed'));
    } finally {
      setVotePending(false);
    }
  };

  /* Vote on an answer */
  const handleAnswerVote = (answerId, direction) => {
    if (!user) { setShowAuth(true); return; }
    const prevVoted = answerVotes[answerId] ?? 0;
    const prevScore = topic?.answersList.find(a => a.id === answerId)?.score ?? 0;
    // Optimistic
    const toggling = prevVoted === direction;
    const newVoted = toggling ? 0 : direction;
    const scoreDelta = toggling ? -direction : direction - prevVoted;
    setAnswerVotes(prev => ({ ...prev, [answerId]: newVoted }));
    setTopic(prev => prev ? {
      ...prev,
      answersList: prev.answersList.map(a =>
        a.id === answerId ? { ...a, score: a.score + scoreDelta } : a
      ),
    } : prev);
    // Persist
    fetch(`${API}/api/forum/answers/${answerId}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ delta: direction }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ score, voted: serverVoted }) => {
        setAnswerVotes(prev => ({ ...prev, [answerId]: serverVoted ?? newVoted }));
        setTopic(prev => prev ? {
          ...prev,
          answersList: prev.answersList.map(a => a.id === answerId ? { ...a, score } : a),
        } : prev);
      })
      .catch(() => {
        setAnswerVotes(prev => ({ ...prev, [answerId]: prevVoted }));
        setTopic(prev => prev ? {
          ...prev,
          answersList: prev.answersList.map(a =>
            a.id === answerId ? { ...a, score: prevScore } : a
          ),
        } : prev);
      });
  };

  /* Submit answer */
  const submitAnswer = async (e) => {
    e?.preventDefault();
    if (!user) { setShowAuth(true); return false; }
    if ((!answer.trim() && answerImages.length === 0) || busy) return false;

    const text = answer.trim();
    const images = answerImages;
    const optimisticId = Date.now();

    const newAnswer = {
      id:       optimisticId,
      author:   user.name,
      initials: user.initials,
      avatar_url: user.avatar_url || '',
      role:     user.role,
      accepted: false,
      score:    0,
      text,
      images,
      replies: [],
    };

    setBusy(true);
    // Optimistic
    setTopic(prev => prev ? {
      ...prev,
      answers: prev.answersList.length + 1,
      answersList: [...prev.answersList, newAnswer],
    } : prev);
    setAnswer('');
    setAnswerImages([]);
    showToast(t('forum.answerSent'));

    try {
      const response = await fetch(`${API}/api/forum/topics/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(newAnswer),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'answer failed');
      if (result.answer) {
        setTopic(prev => prev ? {
          ...prev,
          answersList: mergeAnswerIntoList(prev.answersList, result.answer),
        } : prev);
      }
    } catch { /* optimistic update already applied */ }
    finally { setBusy(false); }
    return true;
  };

  const submitFocusedAnswer = async (event) => {
    const submitted = await submitAnswer(event);
    if (submitted) closeFocusedAnswer();
  };

  const updateReplyDraft = (answerId, value) => {
    setReplyDrafts(prev => ({ ...prev, [answerId]: value }));
  };

  const submitReply = async (event, answerId) => {
    event.preventDefault();
    if (!user) { setShowAuth(true); return; }
    if (replyBusy[answerId]) return;

    const text = (replyDrafts[answerId] || '').trim();
    if (!text) return;

    const optimisticId = `reply-${answerId}-${Date.now()}`;
    const optimisticReply = {
      id: optimisticId,
      answer_id: answerId,
      topic_id: Number(id),
      user_id: user.id,
      author: user.name,
      initials: user.initials,
      avatar_url: user.avatar_url || '',
      role: user.role,
      text,
      images: [],
      created_at: new Date().toISOString(),
    };
    const snapshot = topic;

    setReplyBusy(prev => ({ ...prev, [answerId]: true }));
    setTopic(prev => prev ? {
      ...prev,
      answersList: mergeReplyIntoAnswers(prev.answersList, answerId, optimisticReply),
    } : prev);
    updateReplyDraft(answerId, '');

    try {
      const response = await fetch(`${API}/api/forum/topics/${id}/answers/${answerId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...optimisticReply, id: optimisticId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'reply failed');
      if (result.reply) {
        setTopic(prev => prev ? {
          ...prev,
          answersList: mergeReplyIntoAnswers(prev.answersList, answerId, result.reply),
        } : prev);
      }
      setReplyingTo(null);
      showToast(t('question.replySent'));
    } catch {
      setTopic(snapshot);
      updateReplyDraft(answerId, text);
      showToast(t('question.genericError'));
    } finally {
      setReplyBusy(prev => ({ ...prev, [answerId]: false }));
    }
  };

  /* Accept answer */
  const handleAccept = (answerId) => {
    const isQuestionAuthor = Boolean(user && topic && (topic.user_id ? topic.user_id === user.id : topic.author === user.name));
    if (!isQuestionAuthor && !hasPermission('answer.correctness')) return;

    const snapshot = topic;
    fetch(`${API}/api/forum/topics/${id}/accept/${answerId}`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
    setTopic(prev => prev ? {
      ...prev,
      solved: true,
      answersList: prev.answersList.map(a => (
        a.id === answerId
          ? { ...a, accepted: true, moderation_correctness: 'correct' }
          : { ...a, accepted: false }
      )),
    } : prev);
    showToast(t('question.answerAccepted'));
  };

  const handleSolvedToggle = () => {
    if (!topic) return;
    const snapshot = topic;
    const solved = !topic.solved;
    if (!hasPermission(solved ? 'question.solve' : 'question.open')) return;

    setTopic(prev => prev ? {
      ...prev,
      solved,
      answersList: solved ? prev.answersList : prev.answersList.map(a => ({ ...a, accepted: false })),
    } : prev);
    fetch(`${API}/api/admin/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ solved }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(() => showToast(solved ? t('question.questionSolved') : t('question.questionOpened')))
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  const handleUpdateQuestion = async (form) => {
    if (!user) { setShowAuth(true); throw new Error('auth required'); }
    if (!hasPermission('question.edit')) {
      showToast(t('question.questionUpdateError'));
      throw new Error('permission required');
    }

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 10);

    const payload = {
      category: form.category,
      title: form.title.trim(),
      summary: form.summary.trim(),
      tags: tags.length ? tags : ['savol'],
      images: form.images,
    };

    const response = await fetch(`${API}/api/forum/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(t('question.questionUpdateError'));
      throw new Error(result.error || 'update failed');
    }

    const updated = result.topic || payload;
    setTopic(prev => prev ? {
      ...prev,
      ...updated,
      answersList: updated.answersList || prev.answersList,
      answers: updated.answers ?? prev.answers,
    } : prev);
    setShowEdit(false);
    showToast(t('question.questionUpdated'));
  };

  const handleDeleteQuestion = () => {
    if (!hasPermission('question.delete')) return;
    if (!confirm(t('question.confirmQuestionDelete'))) return;

    fetch(`${API}/api/admin/topics/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(() => {
        showToast(t('question.questionDeleted'));
        navigate('/forum', { replace: true });
      })
      .catch(() => showToast(t('question.genericError')));
  };

  const handleAnswerModeration = (answerId, field, value) => {
    const permissionKey = field === 'helpfulness' ? 'answer.helpfulness' : 'answer.correctness';
    if (!hasPermission(permissionKey)) return;

    if (field === 'correctness' && value === 'correct') {
      handleAccept(answerId);
      return;
    }

    const snapshot = topic;
    const key = field === 'helpfulness' ? 'moderation_helpfulness' : 'moderation_correctness';
    const current = topic.answersList.find(a => a.id === answerId)?.[key] ?? null;
    const next = current === value ? null : value;

    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.map(a => {
        if (a.id !== answerId) return a;
        return {
          ...a,
          [key]: next,
          accepted: field === 'correctness' && next === 'incorrect' ? false : a.accepted,
        };
      });
      const solved = field === 'correctness' && next === 'incorrect'
        ? answersList.some(a => a.accepted)
        : prev.solved;
      return { ...prev, solved, answersList };
    });

    fetch(`${API}/api/admin/answers/${answerId}/moderation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ [field]: next }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ answer: updated }) => {
        setTopic(prev => prev ? {
          ...prev,
          solved: updated.topic_solved ?? prev.solved,
          answersList: prev.answersList.map(a => a.id === answerId ? { ...a, ...updated } : a),
        } : prev);
        showToast(t('question.answerMarked'));
      })
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  const handleDeleteAnswer = (answerId) => {
    if (!hasPermission('answer.delete')) return;
    if (!confirm(t('question.confirmDelete'))) return;

    const snapshot = topic;
    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.filter(a => a.id !== answerId);
      return {
        ...prev,
        answers: answersList.length,
        solved: answersList.some(a => a.accepted),
        answersList,
      };
    });

    fetch(`${API}/api/admin/answers/${answerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ answers, solved }) => {
        setTopic(prev => prev ? { ...prev, answers, solved } : prev);
        showToast(t('question.answerDeleted'));
      })
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  /* ── Render ── */
  if (loading) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <div className="qp-loading">{t('common.loading')}</div>
      </div>
    </Layout>
  );

  if (error || !topic) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <button className="soft-button qp-back" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> {t('common.back')}
        </button>
        <div className="qp-loading" style={{ color: 'var(--rose)' }}>{t('question.notFound')}</div>
      </div>
    </Layout>
  );

  const isAuthor = Boolean(user && (topic.user_id ? topic.user_id === user.id : topic.author === user.name));
  const canEditQuestion = hasPermission('question.edit');
  const canDeleteQuestion = hasPermission('question.delete');
  const canToggleCurrentSolved = hasPermission(topic.solved ? 'question.open' : 'question.solve');
  const canModerateAnswerHelpfulness = hasPermission('answer.helpfulness');
  const canModerateAnswerCorrectness = hasPermission('answer.correctness');
  const canDeleteAnswer = hasPermission('answer.delete');
  const canUseQuestionModbar = canEditQuestion || canDeleteQuestion || canToggleCurrentSolved;
  const canUseAnswerModControls = canModerateAnswerHelpfulness || canModerateAnswerCorrectness || canDeleteAnswer;
  const answerCount = getAnswerCount(topic);
  const createdAt = formatQuestionCreatedAt(topic.created_at, language);

  return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
    <div className="qp-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* Back */}
      <button className="soft-button qp-back" onClick={() => navigate(-1)}>
        <Icon name="arrowLeft" size={15} /> {t('question.forum')}
      </button>

      <div className="qp-layout">
        {/* ── Main column ── */}
        <main className="qp-main">

          {/* Question card */}
          <article className="qp-question">
            <div className="qp-vote-col">
              <button
                aria-busy={votePending}
                className={`qp-vote-btn ${voted===1?'is-active':''}`}
                disabled={votePending}
                onClick={() => handleVote(1)}
                title={t('forum.voteUp')}
              >
                <Icon name="arrowUp" size={18} />
              </button>
              <strong className="qp-score">{topic.score}</strong>
              <button
                aria-busy={votePending}
                className={`qp-vote-btn ${voted===-1?'is-danger':''}`}
                disabled={votePending}
                onClick={() => handleVote(-1)}
                title={t('forum.voteDown')}
              >
                <Icon name="arrowDown" size={18} />
              </button>
              {topic.solved && (
                <span className="qp-solved-badge" title={t('common.solved')}>
                  <Icon name="check" size={14} />
                </span>
              )}
            </div>

            <div className="qp-question-body">
              {/* Meta row */}
              <div className="topic-meta" style={{ marginBottom: 10 }}>
                {topic.pinned && (
                  <span
                    aria-label={t('forum.pinned')}
                    className="pinned-indicator"
                    data-tooltip={t('forum.pinned')}
                    role="img"
                  >
                    <Icon name="pin" size={14} />
                  </span>
                )}
                {topic.hot    && <span className="pill pill--hot">{t('forum.hot')} 🔥</span>}
                {topic.solved && <span className="pill pill--ok">{t('common.solved')} ✓</span>}
                <span>{topic.activity}</span>
                {createdAt && (
                  <time
                    className="topic-created-time"
                    dateTime={topic.created_at}
                    title={`${t('question.createdAt')}: ${createdAt}`}
                  >
                    <Icon name="clock" size={13} />
                    {createdAt}
                  </time>
                )}
              </div>

              <h1 className="qp-title">{topic.title}</h1>
              <div className="question-content">
                <RichText text={topic.summary} className="qp-summary" />
                <AttachmentGallery images={topic.images} size="large" />
              </div>

              {/* Tags */}
              {topic.tags?.length > 0 && (
                <div className="tag-row" style={{ marginTop: 14 }}>
                  {topic.tags.map(tag => (
                    <span className="tag-chip" key={tag}>#{tag}</span>
                  ))}
                </div>
              )}

              {canUseQuestionModbar && (
                <div className="qp-modbar">
                  {canEditQuestion && (
                    <button
                      className="soft-button"
                      onClick={() => setShowEdit(true)}
                      type="button"
                    >
                      <Icon name="edit" size={15} />
                      {t('question.editQuestion')}
                    </button>
                  )}
                  {canToggleCurrentSolved && (
                    <button
                      className={`soft-button ${topic.solved ? 'soft-button--success' : ''}`}
                      onClick={handleSolvedToggle}
                      type="button"
                    >
                      <Icon name={topic.solved ? 'x' : 'check'} size={15} />
                      {topic.solved ? t('question.markOpen') : t('question.markSolved')}
                    </button>
                  )}
                  {canDeleteQuestion && (
                    <button
                      className="soft-button soft-button--danger"
                      onClick={handleDeleteQuestion}
                      type="button"
                    >
                      <Icon name="trash" size={15} />
                      {t('question.deleteQuestion')}
                    </button>
                  )}
                </div>
              )}

              {/* Author footer */}
              <div className="qp-author-row">
                <div className="qp-meta-stats">
                  <span><Icon name="message" size={14} /> {answerCount} {t('forum.answers').toLowerCase()}</span>
                  <span><Icon name="eye" size={14} /> {topic.views} {t('forum.views').toLowerCase()}</span>
                  {createdAt && (
                    <time dateTime={topic.created_at} title={`${t('question.createdAt')}: ${createdAt}`}>
                      <Icon name="clock" size={14} />
                      {createdAt}
                    </time>
                  )}
                  <button
                    aria-label={t('forum.copyLink')}
                    className={`permalink-button ${copiedPermalink === 'question' ? 'is-copied' : ''}`}
                    data-tooltip={copiedPermalink === 'question' ? t('forum.linkCopied') : t('forum.copyLink')}
                    onClick={handleCopyLink}
                    type="button"
                  >
                    <Icon name="link" size={17} />
                  </button>
                </div>
                <div className="qp-author-card">
                  <span className="qp-author-label">{t('question.asked')}</span>
                  <Avatar image={topic.avatar_url} initials={topic.initials} name={topic.author} />
                  <div>
                    <strong>{topic.author}</strong>
                    <span>{topic.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ── Answers ── */}
          <div className="qp-answers-head">
            <h2>{t('forum.answerCount', { count: answerCount })}</h2>
            {topic.solved && <span className="pill pill--ok">{t('common.solved')}</span>}
          </div>

          {topic.answersList.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <Icon name="message" size={22} />
              <strong>{t('forum.noAnswers')}</strong>
              <span>{t('question.firstAnswer')}</span>
            </div>
          ) : (
            <div className="qp-answers-list">
              {[...topic.answersList]
                .sort((a, b) => (b.accepted - a.accepted) || (b.score - a.score))
                .map(ans => (
                  <article
                    id={`answer-${ans.id}`}
                    key={ans.id}
                    className={`qp-answer ${ans.accepted ? 'is-accepted' : ''} ${ans.moderation_correctness === 'incorrect' ? 'is-incorrect' : ''} ${highlightAnswerId === String(ans.id) ? 'is-linked' : ''}`}
                  >
                    <div className="qp-vote-col qp-vote-col--answer">
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === 1 ? 'is-active' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, 1)}
                        title={t('question.helpful')}
                      >
                        <Icon name="arrowUp" size={15} />
                      </button>
                      <span className="qp-answer-score">{ans.score}</span>
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === -1 ? 'is-danger' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, -1)}
                        title={t('question.unhelpful')}
                      >
                        <Icon name="arrowDown" size={15} />
                      </button>
                      {ans.accepted && (
                        <span className="qp-accepted-tick" title={t('question.accepted')}>
                          <Icon name="check" size={15} />
                        </span>
                      )}
                      {(isAuthor || canModerateAnswerCorrectness) && !ans.accepted && (
                        <button
                          className="qp-accept-btn"
                          onClick={() => handleAccept(ans.id)}
                          title={t('question.acceptAnswer')}
                        >
                          <Icon name="check" size={14} />
                        </button>
                      )}
                    </div>

                    <div className="qp-answer-body">
                      <div className="qp-answer-meta">
                        <Avatar image={ans.avatar_url} initials={ans.initials} name={ans.author} />
                        <strong>{ans.author}</strong>
                        <span>{ans.role}</span>
                        {ans.accepted && <span className="pill pill--ok">{t('question.accepted')}</span>}
                        {ans.moderation_correctness && !ans.accepted && (
                          <span className={`pill ${ans.moderation_correctness === 'correct' ? 'pill--ok' : 'pill--bad'}`}>
                            {t(`question.${ans.moderation_correctness}`)}
                          </span>
                        )}
                        {ans.moderation_helpfulness && (
                          <span className={`pill ${ans.moderation_helpfulness === 'helpful' ? 'pill--info' : 'pill--bad'}`}>
                            {t(`question.${ans.moderation_helpfulness}`)}
                          </span>
                        )}
                        <button
                          aria-label={t('question.copyAnswerLink')}
                          className={`permalink-button qp-answer-permalink ${copiedPermalink === `answer-${ans.id}` ? 'is-copied' : ''}`}
                          data-tooltip={copiedPermalink === `answer-${ans.id}` ? t('forum.linkCopied') : t('question.copyAnswerLink')}
                          onClick={() => handleCopyAnswerLink(ans.id)}
                          type="button"
                        >
                          <Icon name="link" size={15} />
                        </button>
                      </div>
                      <RichText className="qp-answer-text" text={ans.text} />
                      <AttachmentGallery images={ans.images} size="large" />

                      <div className="qp-answer-actions">
                        <button
                          className="qp-reply-button"
                          onClick={() => {
                            if (!user) { setShowAuth(true); return; }
                            setReplyingTo(current => current === ans.id ? null : ans.id);
                          }}
                          type="button"
                        >
                          <Icon name="message" size={14} />
                          {t('question.reply')}
                          {(ans.replies?.length || 0) > 0 && <span>{ans.replies.length}</span>}
                        </button>
                      </div>

                      {Array.isArray(ans.replies) && ans.replies.length > 0 && (
                        <div className="qp-replies-list">
                          {ans.replies.map((reply) => (
                            <article className="qp-reply" key={reply.id}>
                              <Avatar image={reply.avatar_url} initials={reply.initials} name={reply.author} />
                              <div>
                                <div className="qp-reply-meta">
                                  <strong>{reply.author}</strong>
                                  <span>{reply.role}</span>
                                  {reply.created_at && (
                                    <time dateTime={reply.created_at}>
                                      {formatQuestionCreatedAt(reply.created_at, language)}
                                    </time>
                                  )}
                                </div>
                                <RichText className="qp-reply-text" text={reply.text} />
                              </div>
                            </article>
                          ))}
                        </div>
                      )}

                      {user && replyingTo === ans.id && (
                        <form className="qp-reply-form" onSubmit={(event) => submitReply(event, ans.id)}>
                          <Avatar image={user.avatar_url} initials={user.initials} name={user.name} online />
                          <div>
                            <textarea
                              onChange={(event) => updateReplyDraft(ans.id, event.target.value)}
                              placeholder={t('question.replyPlaceholder')}
                              rows={3}
                              value={replyDrafts[ans.id] || ''}
                            />
                            <div className="qp-reply-form-actions">
                              <button
                                className="soft-button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  updateReplyDraft(ans.id, '');
                                }}
                                type="button"
                              >
                                {t('composer.cancel')}
                              </button>
                              <button
                                className="primary-button"
                                disabled={!String(replyDrafts[ans.id] || '').trim() || replyBusy[ans.id]}
                                type="submit"
                              >
                                <Icon name="send" size={14} />
                                {replyBusy[ans.id] ? t('question.sendingReply') : t('question.sendReply')}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {canUseAnswerModControls && (
                        <div className="qp-mod-controls">
                          {canModerateAnswerHelpfulness && (
                            <>
                              <button
                                aria-label={t('question.helpful')}
                                className={`qp-mod-chip ${ans.moderation_helpfulness === 'helpful' ? 'is-active' : ''}`}
                                data-tooltip={t('question.helpful')}
                                onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'helpful')}
                                type="button"
                              >
                                <Icon name="thumbsUp" size={14} />
                              </button>
                              <button
                                aria-label={t('question.unhelpful')}
                                className={`qp-mod-chip ${ans.moderation_helpfulness === 'unhelpful' ? 'is-danger' : ''}`}
                                data-tooltip={t('question.unhelpful')}
                                onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'unhelpful')}
                                type="button"
                              >
                                <Icon name="thumbsDown" size={14} />
                              </button>
                            </>
                          )}
                          {canModerateAnswerCorrectness && (
                            <>
                              <button
                                aria-label={t('question.correct')}
                                className={`qp-mod-chip ${ans.accepted || ans.moderation_correctness === 'correct' ? 'is-active' : ''}`}
                                data-tooltip={t('question.correct')}
                                onClick={() => handleAnswerModeration(ans.id, 'correctness', 'correct')}
                                type="button"
                              >
                                <Icon name="check" size={14} />
                              </button>
                              <button
                                aria-label={t('question.incorrect')}
                                className={`qp-mod-chip ${ans.moderation_correctness === 'incorrect' ? 'is-danger' : ''}`}
                                data-tooltip={t('question.incorrect')}
                                onClick={() => handleAnswerModeration(ans.id, 'correctness', 'incorrect')}
                                type="button"
                              >
                                <Icon name="x" size={14} />
                              </button>
                            </>
                          )}
                          {canDeleteAnswer && (
                            <button
                              aria-label={t('question.delete')}
                              className="qp-mod-chip is-danger"
                              data-tooltip={t('question.delete')}
                              onClick={() => handleDeleteAnswer(ans.id)}
                              type="button"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}

          {/* ── Answer box ── */}
          <div className="qp-answer-box">
            <h3>{t('forum.writeAnswer')}</h3>
            {user ? (
              <form
                className={answerDropTarget.isDragging ? 'is-dragging' : ''}
                onSubmit={submitAnswer}
                {...answerDropTarget.dropTargetProps}
              >
                <div className="qp-answerer">
                  <Avatar image={user.avatar_url} initials={user.initials} name={user.name} online />
                  <strong>{user.name}</strong>
                </div>
                <AnswerEditorTools
                  onChange={setAnswer}
                  onKeyboardOpen={() => openFocusedAnswer(true)}
                  textareaRef={answerRef}
                  value={answer}
                />
                <textarea
                  ref={answerRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onFocus={() => openFocusedAnswer(false)}
                  placeholder={t('forum.answerPlaceholder')}
                  rows={5}
                />
                {answerImages.length > 0 && (
                  <div className="composer-editor-images">
                    {answerImages.map((image) => (
                      <figure key={image.id}>
                        <img alt={image.name} src={image.src} />
                        <button
                          aria-label={t('composer.removeImage', { name: image.name })}
                          onClick={() => removeAnswerImage(image.id)}
                          type="button"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
                <ImageDropZone
                  count={answerImages.length}
                  onFiles={handleAnswerImages}
                  renderIcon={(size) => <Icon name="image" size={size} />}
                />
                {(answer.trim() || answerImages.length > 0) && (
                  <div className="latex-live-preview answer-live-preview">
                    <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
                    <RichText className="qp-answer-text" text={answer} />
                    <AttachmentGallery images={answerImages} />
                  </div>
                )}
                <button
                  className="primary-button"
                  disabled={(!answer.trim() && answerImages.length === 0) || busy}
                  type="submit"
                >
                  <Icon name="send" size={16} />
                  {busy ? t('forum.sending') : t('forum.sendAnswer')}
                </button>
              </form>
            ) : (
              <div className="qp-auth-prompt">
                <p>{t('question.signInToAnswer')}</p>
                <button className="primary-button" onClick={() => setShowAuth(true)}>
                  {t('question.loginOrRegister')}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="qp-sidebar">
          <div className="panel-card">
            <div className="section-heading">
              <h3>{t('question.about')}</h3>
            </div>
            <div className="qp-sidebar-stats">
              <div><span>{t('question.asked')}</span><strong>{topic.author}</strong></div>
              {createdAt && <div><span>{t('question.createdAt')}</span><strong>{createdAt}</strong></div>}
              <div><span>{t('question.activity')}</span><strong>{topic.activity}</strong></div>
              <div><span>{t('forum.views')}</span><strong>{topic.views}</strong></div>
              <div><span>{t('forum.answers')}</span><strong>{answerCount}</strong></div>
              <div><span>{t('question.status')}</span><strong>{topic.solved ? `✓ ${t('common.solved')}` : t('common.open')}</strong></div>
            </div>
          </div>

          {topic.tags?.length > 0 && (
            <div className="panel-card">
              <div className="section-heading"><h3>{t('question.tags')}</h3></div>
              <div className="tag-row">
                {topic.tags.map(tag => (
                  <span className="tag-chip" key={tag}>#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {user && focusedAnswerOpen && (
        <FocusedAnswerComposer
          defaultKeyboardOpen={focusedAnswerKeyboardOpen}
          images={answerImages}
          onChange={setAnswer}
          onClose={closeFocusedAnswer}
          onImagesChange={handleAnswerImages}
          onRemoveImage={removeAnswerImage}
          onSubmit={submitFocusedAnswer}
          submitting={busy}
          user={user}
          value={answer}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showEdit && topic && (
        <EditQuestionModal
          onClose={() => setShowEdit(false)}
          onSubmit={handleUpdateQuestion}
          topic={topic}
        />
      )}
    </div>
    </Layout>
  );
}
