'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Radio, Users, Send, Check, X, BarChart2, Plus, Zap, ArrowLeft, Loader2, Play, AlertCircle
} from 'lucide-react';

export default function TeacherLiveControl() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.code as string;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time Attendees
  const [attendees, setAttendees] = useState<any[]>([]);
  
  // Lesson Pushing
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [pushedLessonId, setPushedLessonId] = useState('');

  // Poll
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Зөв', 'Буруу']);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [pollResults, setPollResults] = useState<any>(null);
  
  // Socket
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

  // Load Session Info from REST first
  const loadSession = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/code/${sessionCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Live хичээл олдсонгүй');
      const data = await res.json();
      setSession(data);
      
      // Load full session with details (attendees and previous polls)
      const detailRes = await fetch(`${apiUrl}/live-sessions/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setAttendees(detailData.attendees || []);
        
        // Find active poll
        const active = detailData.polls?.find((p: any) => p.isActive);
        if (active) {
          setActivePoll(active);
          // Fetch its results
          const resultsRes = await fetch(`${apiUrl}/live-sessions/polls/${active.id}/results`);
          if (resultsRes.ok) setPollResults(await resultsRes.json());
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
      router.push('/teacher/live');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionCode]);

  // Connect Socket
  useEffect(() => {
    if (!session) return;

    const token = getToken();
    const socket = io(getWSUrl(), {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-session', { sessionCode });
    });

    socket.on('attendee-update', (user: any) => {
      setAttendees(prev => {
        if (prev.some(a => a.studentId === user.userId)) return prev;
        return [...prev, { student: { fullName: user.fullName, id: user.userId } }];
      });
      showToast(`${user.fullName} нэгдлээ`);
    });

    socket.on('attendee-left', (meta: any) => {
      setAttendees(prev => prev.filter(a => a.studentId !== meta.userId));
    });

    socket.on('poll-results', (results: any) => {
      setPollResults(results);
    });

    socket.on('error', (err: any) => {
      showToast(err.message, 'error');
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  const handlePushContent = () => {
    if (!selectedLessonId || !socketRef.current || !session) return;
    const lesson = session.course?.modules?.flatMap((m: any) => m.lessons)?.find((l: any) => l.id === selectedLessonId);
    if (!lesson) return;

    socketRef.current.emit('push-content', {
      sessionId: session.id,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      content: lesson.contentBody || 'Хичээлийн агуулга хоосон байна',
    });
    setPushedLessonId(lesson.id);
    showToast('Хичээлийн агуулгыг оюутнуудад амжилттай илгээлээ');
  };

  const handleLaunchPoll = () => {
    if (!pollQuestion.trim() || !socketRef.current || !session) return;

    socketRef.current.emit('launch-poll', {
      sessionId: session.id,
      question: pollQuestion.trim(),
      options: pollOptions.filter(opt => opt.trim() !== ''),
    });

    setPollQuestion('');
    setPollOptions(['Зөв', 'Буруу']);
    setShowPollForm(false);
    showToast('Санал асуулгыг эхлүүллээ');
    
    // Refresh to get new poll ID
    setTimeout(() => {
      loadSession();
    }, 1000);
  };

  const handleEndSession = async () => {
    if (!confirm('Энэ live хичээлийг хаах уу?')) return;
    if (socketRef.current && session) {
      socketRef.current.emit('end-session', { sessionId: session.id });
    }
    showToast('Live хичээл хаагдлаа');
    router.push('/teacher/live');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/teacher/live" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20 font-mono tracking-widest">
                PIN: {sessionCode}
              </span>
              <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse uppercase tracking-wider">
                Шууд дамжуулалт
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-1">{session?.title}</h2>
          </div>
        </div>

        <button
          onClick={handleEndSession}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10"
        >
          Хичээлийг дуусгах
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Live Attendees & Content Pushing */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Content Pushing Board */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="w-4 h-4 text-orange-500" />
              Хичээлийн агуулга илгээх
            </h3>
            <p className="text-[11px] text-slate-400">Сонгосон лекц эсвэл практик зааврын текстийг оюутнуудын дэлгэц дээр бодит цагт гаргаж харуулна.</p>
            
            <div className="flex gap-3">
              <select
                value={selectedLessonId}
                onChange={e => setSelectedLessonId(e.target.value)}
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
              >
                <option value="">— Лекц сонгох —</option>
                {session?.course?.modules?.flatMap((m: any) => m.lessons).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              <button
                onClick={handlePushContent}
                disabled={!selectedLessonId}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Илгээх
              </button>
            </div>

            {pushedLessonId && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>Илгээсэн лекц: <b>{session?.course?.modules?.flatMap((m: any) => m.lessons).find((l: any) => l.id === pushedLessonId)?.title}</b></span>
              </div>
            )}
          </div>

          {/* Interactive Live Poll Board */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-orange-500" />
                Бодит цагийн санал асуулга (Live Poll)
              </h3>
              <button
                onClick={() => setShowPollForm(v => !v)}
                className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                {showPollForm ? 'Хаах' : 'Шинэ санал асуулга'}
              </button>
            </div>

            {showPollForm && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <input
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Асуултаа оруулна уу..."
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                />
                
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 block uppercase">Сонголтууд</label>
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Сонголт ${idx + 1}`}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  ))}
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-[9px] font-bold text-orange-500 hover:underline"
                  >
                    + Сонголт нэмэх
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleLaunchPoll}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Санал асуулгыг эхлүүлэх
                  </button>
                </div>
              </div>
            )}

            {/* Poll Results Display */}
            {pollResults ? (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 rounded-2xl">
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Идэвхтэй санал асуулга</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{pollResults.question}</p>
                </div>

                <div className="space-y-3">
                  {pollResults.results?.map((res: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700 dark:text-slate-350">{res.option}</span>
                        <span className="text-slate-900 dark:text-white font-bold">{res.votes} санал ({res.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${res.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 italic text-right">Нийт өгсөн санал: {pollResults.totalVotes}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">Одоогоор ямар нэгэн санал асуулга идэвхжээгүй байна.</p>
            )}
          </div>
        </div>

        {/* Right column: Connect Students & Chat Frame */}
        <div className="space-y-6">
          
          {/* Attendees List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-orange-500" /> Холбогдсон оюутнууд</span>
              <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                {attendees.length}
              </span>
            </h3>

            {attendees.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Оюутнууд нэвтрэхийг хүлээж байна...</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {attendees.map((attendee, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{attendee.student?.fullName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Frame Placeholder */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Бодит цагийн чат (Chat)
            </h3>
            
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">Чатны боломж</p>
              <p className="text-[10px] text-slate-400">Чатыг дараагийн шатны хөгжүүлэлтийн явцад идэвхжүүлэхээр төлөвлөсөн болно.</p>
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
