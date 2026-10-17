import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, AlertCircle, Loader, RefreshCw, Info } from 'lucide-react';

function Message({ msg }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isAI ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'
      }`}>
        {isAI ? <Bot size={14} /> : <User size={14} />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isAI ? '' : 'flex flex-col items-end'}`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isAI
            ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
            : 'bg-indigo-600 text-white rounded-tr-none'
        }`}>
          {msg.content}
        </div>
        {msg.timestamp && (
          <p className="text-[10px] text-slate-400 mt-0.5 px-1">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  'Break my biggest task into smaller steps',
  'Why might my schedule be unrealistic?',
  'How do I recover after procrastination?',
  'Suggest how to structure my next study session',
  'Summarise my current study plan',
  'I\'m feeling overwhelmed — what should I do first?',
];

export default function AIAssistantPage({ tasks, sessions }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your study planning assistant. I can help you break down assignments, understand your schedule, and suggest ways to recover if you\'ve fallen behind.\n\nWhat would you like help with today?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    setError(null);
    const userMsg = { role: 'user', content: userText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, conversationHistory: history }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fallback) {
          setAiUnavailable(true);
          setError(data.error || 'AI assistant unavailable.');
        } else {
          setError(data.error || 'Something went wrong.');
        }
        return;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setError('Could not reach the server. Make sure the StudyFlow server is running.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. What would you like help with?',
      timestamp: new Date().toISOString(),
    }]);
    setError(null);
    setAiUnavailable(false);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bot size={20} className="text-indigo-500" />
            AI Study Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Powered by NVIDIA · Uses your actual tasks and schedule</p>
        </div>
        <button className="sf-btn sf-btn-ghost text-xs gap-1.5" onClick={clearChat}>
          <RefreshCw size={13} /> Clear chat
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          The AI assistant uses your study data to give relevant advice. It cannot diagnose conditions, modify your schedule directly, or guarantee outcomes. Verify any suggested changes before applying them.
        </p>
      </div>

      {/* AI unavailable notice */}
      {aiUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-3 flex gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">AI assistant not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add your NVIDIA_API_KEY to the .env file and restart the server. Your schedule and tasks work normally without AI.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 px-1 mb-3" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <Loader size={14} className="text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
        {error && !aiUnavailable && (
          <div className="flex gap-2 text-red-600 text-xs p-2 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {SUGGESTED_PROMPTS.map((p, i) => (
            <button
              key={i}
              className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              onClick={() => sendMessage(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); sendMessage(); }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your study plan…"
          className="flex-1 text-sm px-4 py-2.5 rounded-xl"
          disabled={loading}
          maxLength={1000}
          aria-label="Message to AI assistant"
        />
        <button
          type="submit"
          className="sf-btn sf-btn-primary px-4"
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
