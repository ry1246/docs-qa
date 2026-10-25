import { useRef, useState } from 'react';
import { ask, type Source } from './lib/ask';

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export default function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const busy = status === 'loading' || status === 'streaming';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer('');
    setSources([]);
    setError(null);
    setTruncated(false);
    setStatus('loading');

    try {
      for await (const ev of ask(question, controller.signal)) {
        switch (ev.type) {
          case 'sources':
            setSources(ev.sources);
            break;
          case 'delta':
            setStatus('streaming');
            setAnswer(prev => prev + ev.text);
            break;
          case 'done':
            setTruncated(ev.truncated);
            setStatus('done');
            break;
          case 'error':
            setError(ev.message);
            setStatus('error');
            break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setStatus('idle');
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={4}
          placeholder="メモについての質問を入力"
        />
        <button type="submit" disabled={!question.trim() || busy}>
          質問する
        </button>
        {busy && (
          <button type="button" onClick={handleCancel}>
            中断
          </button>
        )}
      </form>

      {status === 'loading' && <p>検索中...</p>}
      {error && <p role="alert">{error}</p>}

      {sources.length > 0 && (
        <section>
          <h2>出典</h2>
          <ol>
            {sources.map(s => (
              <li key={s.index}>
                {s.sourcePath}
                {s.heading && ` > ${s.heading}`}
              </li>
            ))}
          </ol>
        </section>
      )}

      {answer && (
        <section>
          <h2>回答</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
          {truncated && <p>※ 最大トークン数に達したため、回答が途中で切れています。</p>}
        </section>
      )}
    </main>
  );
}
