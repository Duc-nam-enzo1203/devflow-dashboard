import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Maximize2,
  Minimize2,
  MessageSquare
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AIChat() {
  const { t, language } = useSettings();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: language === 'vi' ? 'Chào bạn! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho bạn hôm nay?' : 'Hello! I am your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!user) {
      const needLogin: Message = {
        id: Date.now().toString(),
        role: 'ai',
        text:
          language === 'vi'
            ? 'Vui lòng đăng nhập để dùng trợ lý AI.'
            : 'Please sign in to use the AI assistant.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, needLogin]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        accessToken = refreshed.session?.access_token;
      }
      if (!accessToken) {
        throw new Error('NO_SESSION');
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: input, history },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data?.reply || (language === 'vi' ? 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu.' : 'Sorry, I encountered an error processing your request.'),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_SESSION') {
        const msg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text:
            language === 'vi'
              ? 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại rồi thử AI chat.'
              : 'Your session expired. Please sign out and sign in again, then try AI chat.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, msg]);
        return;
      }
      let serverHint = '';
      if (error instanceof FunctionsHttpError && error.context instanceof Response) {
        try {
          const j = (await error.context.json()) as { error?: string };
          if (typeof j?.error === 'string') serverHint = j.error.slice(0, 200);
        } catch {
          /* body not JSON */
        }
      }
      console.error('AI Chat Error:', error, serverHint || undefined);
      const base =
        language === 'vi'
          ? 'Có lỗi xảy ra. Vui lòng thử lại sau.'
          : 'An error occurred. Please try again later.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: serverHint ? `${base} (${serverHint})` : base,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6 sm:max-w-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`flex max-h-[min(85vh,700px)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl transition-all duration-300 ${
              isExpanded
                ? 'h-[min(85vh,700px)] w-[min(500px,calc(100vw-1.5rem))]'
                : 'h-[min(70vh,550px)] w-[min(380px,calc(100vw-1.5rem))]'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-accent-primary text-white flex items-center justify-between shadow-lg shadow-accent-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t('ai_assistant')}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === 'user' ? 'bg-accent-primary text-white' : 'bg-white text-accent-primary border border-slate-100'
                    }`}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-accent-primary text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {msg.text}
                      <div className={`text-[10px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-xl bg-white text-accent-primary border border-slate-100 flex items-center justify-center shadow-sm">
                      <Bot size={14} />
                    </div>
                    <div className="p-3 bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-accent-primary" />
                      <span className="text-xs font-medium italic">{t('analyzing')}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('ask_ai')}
                  className="flex-1 pl-4 pr-12 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 p-2 bg-accent-primary text-white rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                Powered by Gemini AI • {user?.name || 'DevFlow'} Assistant
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-accent-primary text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
          >
            1
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
