import { useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function useForumStream(onNewTopic, onInit, onAnswer, onVote, onAccept) {
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
        try { onNewTopic(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // New answer — { topicId, answer, answers }
      es.addEventListener('answer', (e) => {
        try { if (onAnswer) onAnswer(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Vote update — { topicId, score }
      es.addEventListener('vote', (e) => {
        try { if (onVote) onVote(JSON.parse(e.data)); }
        catch { /* ignore */ }
      });

      // Answer accepted — { topicId, answerId }
      es.addEventListener('accept', (e) => {
        try { if (onAccept) onAccept(JSON.parse(e.data)); }
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
