import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Trash2,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { SUGGESTED_CHAT_QUESTIONS } from '../data/constants';
import { sendAssistantChat } from '../services/api';
import type {
  ChatMessage,
  EnvironmentalSnapshot,
  LanguageCode,
  SavedRecommendation,
  UserProfile,
} from '../types/freshair';
import { formatReading, getUsAqiCategory } from '../utils/aqi';

interface AssistantViewProps {
  environment: EnvironmentalSnapshot | null;
  profile: UserProfile;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  savedItems: SavedRecommendation[];
  onToggleSave: (item: Omit<SavedRecommendation, 'id' | 'savedAt'>) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  environment,
  profile,
  language,
  onChangeLanguage,
  savedItems,
  onToggleSave,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const aq = environment?.airQuality ?? null;
  const aqiMeta = getUsAqiCategory(aq?.usAqi ?? null);
  const suggestions = SUGGESTED_CHAT_QUESTIONS[language];

  const handleSend = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!promptText) setInput('');
    setSending(true);
    setLastFailedPrompt(null);

    try {
      const historyPayload = nextMessages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendAssistantChat(historyPayload, environment, profile, language);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          timestamp: res.generatedAt,
        },
      ]);
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : 'Unable to reach the FreshAir-AI Assistant right now.';
      setLastFailedPrompt(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errText,
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend();
  };

  return (
    <div className="space-y-4">
      {/* Grounded Context Toolbar */}
      <div className="bg-white border border-[#E2E8E4] rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
            {language === 'hi' ? 'FreshAir-AI वायु गुणवत्ता सहायक' : 'FreshAir-AI Air Quality Assistant'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#526460]">
            <span>
              Context: <strong className="font-medium text-[#0F1F1C]">{environment?.location.name ?? 'No location loaded'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              US AQI: {formatReading(aq?.usAqi, '', 0)} ({language === 'hi' ? aqiMeta.labelHi : aqiMeta.label})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">PM2.5: {formatReading(aq?.pm25, 'µg/m³', 1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-[#F2F5F3] rounded-lg">
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'en' ? 'bg-white text-[#0F1F1C] shadow-xs' : 'text-[#526460] hover:text-[#0F1F1C]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('hi')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'hi' ? 'bg-white text-[#0F1F1C] shadow-xs' : 'text-[#526460] hover:text-[#0F1F1C]'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setLastFailedPrompt(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#526460] hover:text-[#B91C1C] border border-[#DCE3DF] rounded-lg transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {language === 'hi' ? 'चैट साफ़ करें' : 'Clear Chat'}
            </button>
          )}
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="bg-white border border-[#E2E8E4] rounded-xl flex flex-col min-h-[540px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto py-6">
              <p className="font-display text-lg font-semibold text-[#0F1F1C]">
                {language === 'hi'
                  ? 'आज की वायु गुणवत्ता के बारे में कुछ भी पूछें'
                  : 'Ask anything about today’s air quality and daily decisions'}
              </p>
              <p className="mt-1.5 text-sm text-[#526460] leading-relaxed">
                {language === 'hi'
                  ? 'सहायक केवल Open-Meteo के वास्तविक डेटा और आपकी प्रोफ़ाइल के आधार पर उत्तर देता है। यह कोई भी AQI संख्या मनगढ़ंत नहीं बनाता।'
                  : 'Responses are grounded strictly in your verified Open-Meteo readings and household profile. Missing measurements are never fabricated.'}
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void handleSend(q)}
                    className="p-3.5 rounded-lg border border-[#DCE3DF] hover:border-[#0F766E] hover:bg-[#F5FAF8] text-left text-xs sm:text-sm text-[#1E312D] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const titlePreview =
                msg.content.split('\n')[0].replace(/^[-*•#\s]+/, '').slice(0, 70) || 'AI Assistant Guidance';
              const isSaved = savedItems.some(
                (item) => item.category === 'assistant' && item.body === msg.content,
              );

              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0F766E] text-white'
                        : msg.error
                          ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                          : 'bg-[#F6F8F7] border border-[#E2E8E4] text-[#0F1F1C]'
                    }`}
                  >
                    {msg.error && (
                      <div className="flex items-center gap-2 font-medium text-xs mb-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Assistant Request Failed</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                    {msg.role === 'assistant' && !msg.error && (
                      <div className="mt-3 pt-2.5 border-t border-[#E2E8E4] flex items-center justify-between gap-3">
                        <span className="text-[11px] text-[#647571]">
                          Informational guidance · Not medical advice
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleSave({
                              title: titlePreview,
                              body: msg.content,
                              category: 'assistant',
                              locationName: environment?.location.name ?? 'Selected Location',
                              aqiAtSave: aq?.usAqi ?? null,
                              language,
                            })
                          }
                          className={`inline-flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap ${
                            isSaved ? 'text-[#0F766E]' : 'text-[#526460] hover:text-[#0F1F1C]'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5" />
                              Saved
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-3.5 w-3.5" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {msg.error && lastFailedPrompt && (
                      <button
                        type="button"
                        onClick={() => void handleSend(lastFailedPrompt)}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-[#991B1B] border border-[#FECACA] rounded-md hover:bg-[#FFF5F5]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry Question
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#F6F8F7] border border-[#E2E8E4] rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#526460]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
                <span>
                  {language === 'hi'
                    ? 'वास्तविक वायु डेटा के आधार पर उत्तर तैयार किया जा रहा है...'
                    : 'Analyzing verified air quality readings...'}
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[#E2E8E4] p-3.5 sm:p-4 bg-[#FAFCFB] rounded-b-xl space-y-2.5"
        >
          {messages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {suggestions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => void handleSend(q)}
                  className="px-3 py-1 text-xs text-[#445652] bg-white border border-[#DCE3DF] hover:border-[#0F766E] rounded-md whitespace-nowrap shrink-0 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder={
                language === 'hi'
                  ? 'वायु गुणवत्ता, मास्क, वेंटिलेशन या यात्रा के बारे में पूछें...'
                  : 'Ask about outdoor exercise, ventilation timing, masks, or low-emission commuting...'
              }
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'hi' ? 'भेजें' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
