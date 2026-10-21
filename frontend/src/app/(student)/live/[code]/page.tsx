'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Radio, BookOpen, Clock, X, Check, BarChart2, MessageSquare, ArrowLeft, Loader2, Info, Send
} from 'lucide-react';

export default function StudentLiveSession() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.code as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Live Pushed Content
  const [pushedTitle, setPushedTitle] = useState('');
  const [pushedContent, setPushedContent] = useState('');

  // Active Poll
  const [activePoll, setActivePoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [pollSubmitted, setPollSubmitted] = useState(false);
  const [pollResults, setPollResults] = useState<any>(null);

  // Socket connection reference
  const socketRef = useRef<Socket | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const getWSUrl = () => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    return api.replace('/api', '/live');
  };
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // 1. Fetch Session metadata
  const loadSession = async () => {
    try {
      const res = await fetch(`${apiUrl}/live-sessions/code/${sessionCode}`);
      if (!res.ok) throw new Error('Live хичээл олдсонгүй');
      const data = await res.json();
      setSession(data);
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionCode]);

  // 2. Connect Socket
  useEffect(() => {
    if (!session) return;

    const token = getToken();
    const socket = io(getWSUrl(), {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-session', { sessionCode });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Content push event
    socket.on('content-pushed', (data: any) => {
      setPushedTitle(data.lessonTitle);
      setPushedContent(data.content);
      showToast('Багш шинэ агуулга илгээлээ');
    });

    // Poll launched event
    socket.on('poll-launched', (poll: any) => {
      setActivePoll(poll);
      setSelectedOption(null);
      setPollSubmitted(false);
      setPollResults(null);
      showToast('Шинэ санал асуулга эхэллээ');
    });

    // Poll results real-time update
    socket.on('poll-results', (results: any) => {
      setPollResults(results);
    });

    // Session ended event
    socket.on('session-ended', () => {
      showToast('Live хичээл дууслаа', 'error');
      setTimeout(() => {
        router.push('/courses');
      }, 2000);
    });

    socket.on('error', (err: any) => {
      showToast(err.message, 'error');
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  const handleSubmitPoll = () => {
    if (selectedOption === null || !activePoll || !socketRef.current) return;
    
    socketRef.current.emit('submit-poll-answer', {
      pollId: activePoll.pollId,
      optionIndex: selectedOption,
    });
    
    setPollSubmitted(true);
    showToast('Хариулт амжилттай илгээгдлээ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/courses" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                {connected ? 'Холбогдсон' : 'Холбогдоогүй'}
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-1">{session?.title}</h2>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400">Багш:</p>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{session?.teacher?.fullName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main lesson content window */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
            {pushedContent ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {pushedTitle}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-mono">Багшаас илгээсэн агуулга</span>
                </div>
                <article className="prose dark:prose-invert prose-xs max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {pushedContent}
                  </ReactMarkdown>
                </article>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 flex-1 my-12">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-wider">Багшийн зааврыг хүлээн авч байна</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs text-center leading-normal">
                  Багш хичээлийн агуулга эсвэл практик зааврыг илгээхэд энэ хэсэгт автоматаар шинэчлэгдэн харагдах болно.
                </p>
              </div>
            )}
            
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900 rounded-2xl flex items-start gap-2 mt-6">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                Хичээлийн үед багшийн тавьсан асуултад шууд хариулж, идэвхтэй оролцсоноор практик чадамжийн үнэлгээнд нөлөөлнө.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Quiz/Poll & Chat placeholder */}
        <div className="space-y-6">
          
          {/* Active Live Poll card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              Идэвхтэй асуулт
            </h3>

            {activePoll ? (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 rounded-2xl">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    {activePoll.question}
                  </p>
                </div>

                {!pollSubmitted ? (
                  <div className="space-y-2">
                    {activePoll.options?.map((opt: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(idx)}
                        className={`w-full text-left p-3 rounded-xl text-xs font-medium border transition-all ${
                          selectedOption === idx
                            ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-950 dark:border-slate-850 text-slate-600 dark:text-slate-350 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}

                    <button
                      onClick={handleSubmitPoll}
                      disabled={selectedOption === null}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/10"
                    >
                      Хариултыг илгээх
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold text-center">✓ Хариултыг багшид амжилттай илгээлээ.</p>
                    
                    {pollResults && (
                      <div className="space-y-2.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Нэгдсэн санал хураалтын дүн:</p>
                        {pollResults.results?.map((res: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-600 dark:text-slate-350">{res.option}</span>
                              <span className="text-slate-800 dark:text-white font-bold">{res.votes} санал ({res.percentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${res.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">Багшаас асуулт тавихыг хүлээнэ үү...</p>
            )}
          </div>

          {/* Chat placeholder */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              Бодит цагийн чат
            </h3>
            
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-[10px] italic">
              Чат нь дараагийн шатны хөгжүүлэлтийн явцад идэвхжих болно.
            </div>
          </div>
        </div>

      </div>

      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-bounce">
          <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/10'
              : 'bg-rose-500 border-rose-600 text-white shadow-rose-500/10'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}
