import { useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useForumStream(
  onNewTopic,
  onInit,
  onAnswer,
  onVote,
  onAccept,
  onAnswerVote,
  onTopicModeration,
  onAnswerModeration,
  onAnswerDeleted,
  onTopicUpdate,
  onTopicDeleted,
  onAnswerReply
) {
  useEffect(() => {
    let es;
    let retryTimeout;

    function connect() {
      es = new EventSource(`${API}/api/forum/stream`);

      // All existing topics on first connect
      es.addEventListener('init', (e) => {
        try {
          const topics = JSON.parse(e.data);
          if (Array.isArray(topics) && onInit) onInit(topics);
        } catch { /* ignore */ }
      });

      // New topic — { ...topicFields, answersList: [] }
      es.addEventListener('topic', (e) => {
        try { if (onNewTopic) onNewTopic(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Edited topic — { ...topicFields }
      es.addEventListener('topicUpdate', (e) => {
        try { if (onTopicUpdate) onTopicUpdate(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Deleted topic — { topicId }
      es.addEventListener('topicDeleted', (e) => {
        try { if (onTopicDeleted) onTopicDeleted(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // New answer — { topicId, answer, answers }
      es.addEventListener('answer', (e) => {
        try { if (onAnswer) onAnswer(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Topic vote update — { topicId, score }
      es.addEventListener('vote', (e) => {
        try { if (onVote) onVote(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer accepted — { topicId, answerId }
      es.addEventListener('accept', (e) => {
        try { if (onAccept) onAccept(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Topic moderation update — { topicId, solved }
      es.addEventListener('topicModeration', (e) => {
        try { if (onTopicModeration) onTopicModeration(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer vote update — { answerId, score }
      es.addEventListener('answerVote', (e) => {
        try { if (onAnswerVote) onAnswerVote(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer moderation update — { answerId, moderation_helpfulness, moderation_correctness }
      es.addEventListener('answerModeration', (e) => {
        try { if (onAnswerModeration) onAnswerModeration(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer deleted — { topicId, answerId, answers, solved }
      es.addEventListener('answerDeleted', (e) => {
        try { if (onAnswerDeleted) onAnswerDeleted(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer reply — { topicId, answerId, reply }
      es.addEventListener('answerReply', (e) => {
        try { if (onAnswerReply) onAnswerReply(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
