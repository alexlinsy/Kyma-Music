'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  onResponse?: (speech: string, tracks: string[]) => void;
  onSendRequest?: () => boolean;
  history?: string[];
}

export default function ChatWindow({ onResponse, onSendRequest, history = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello, I'm Kyma. What's on your mind today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (onSendRequest && !onSendRequest()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          history,
          localTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.speech }]);
        if (onResponse) {
          onResponse(data.speech, data.tracks || []);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `大脑报错: ${data.speech || '未知错误'}` }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '连接大脑失败，请检查网络或 API Key。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[450px] w-full bg-kyma-panel border border-kyma-primary/20 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-colors duration-500">
      {/* Header - Notion Style */}
      <div className="px-4 py-3 border-b border-kyma-text/5 bg-kyma-text/5 transition-colors duration-500">
        <h3 className="text-kyma-text/90 text-sm font-semibold flex items-center gap-2 tracking-tight">
          <div className="w-1.5 h-1.5 rounded-full bg-kyma-primary" />
          Kyma DJ Chat
        </h3>
      </div>

      {/* Messages - Whisper Borders & Warm Dark */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-kyma-primary text-white rounded-2xl rounded-tr-none' 
                : 'bg-kyma-bg text-kyma-text border border-kyma-text/5 rounded-2xl rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="text-zinc-500 text-xs px-1 animate-pulse">
              Kyma is typing...
            </div>
          </div>
        )}
      </div>

      {/* Input - Notion Pill Style */}
      <div className="p-4 bg-kyma-text/5 transition-colors duration-500">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Talk to Kyma..."
            className="w-full bg-kyma-bg text-kyma-text text-sm rounded-lg py-2.5 px-4 pr-10 focus:outline-none border border-kyma-text/10 focus:border-kyma-primary/50 transition-all placeholder:text-zinc-600"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-1.5 p-1 text-kyma-primary hover:brightness-125 transition-colors disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
