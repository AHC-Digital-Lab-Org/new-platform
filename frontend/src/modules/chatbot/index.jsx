import { useState } from 'react';
import { ask } from './api.js';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', text: q }]);
    try {
      const { answer } = await ask(q);
      setMessages((m) => [...m, { role: 'bot', text: answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Asistente</h1>
      <div className="mt-4 flex h-96 flex-col gap-2 overflow-y-auto rounded-lg border bg-white p-4">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[80%] rounded-lg px-3 py-2 ${m.role === 'user' ? 'self-end bg-emerald-700 text-white' : 'self-start bg-slate-100'}`}
          >
            {m.text}
          </p>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pregunta algo sobre la web…"
          className="flex-1 rounded-md border px-3 py-2 focus:outline-2 focus:outline-emerald-600"
        />
        <button disabled={sending} className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50">
          Enviar
        </button>
      </form>
    </section>
  );
}
