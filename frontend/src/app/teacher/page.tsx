'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Users, ClipboardCheck, Sparkles, ArrowRight,
  TrendingUp, Award, Clock, MessageSquare, Check, X, ShieldAlert, AlertCircle, RefreshCw
} from 'lucide-react';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('courses');
  const [teacherName, setTeacherName] = useState('Багш');
  const [user, setUser] = useState<any>(null);

  // Data lists
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  // Grading Modal/Form states
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [criteriaScores, setCriteriaScores] = useState<{ [criteriaId: string]: number }>({});
  const [gradingCbtStatus, setGradingCbtStatus] = useState<'COMPETENT' | 'NOT_YET_COMPETENT'>('COMPETENT');
  const [gradingFeedback, setGradingFeedback] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDashboardData = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;

    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);
    setTeacherName(parsedUser.fullName || 'Багш');

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      // 1. Fetch courses
      const courseRes = await fetch(`${apiUrl}/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
      });
      if (courseRes.ok) {
        setCourses(await courseRes.json());
      }

      // 2. Fetch submissions
      const subRes = await fetch(`${apiUrl}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
      });
      if (subRes.ok) {
        setSubmissions(await subRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast('Мэдээлэл авахад алдаа гарлаа', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch chat contacts when chat tab is selected
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatContacts();
    }
  }, [activeTab]);

  const fetchChatContacts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      // Teachers can chat with students/colleagues in any of their courses. We pass first courseId or empty
      const courseQuery = courses.length > 0 ? `?courseId=${courses[0].id}` : '';
      const res = await fetch(`${apiUrl}/messages/contacts${courseQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChatContacts(data);
        if (data.length > 0 && !activeContact) {
          setActiveContact(data[0]);
          fetchConversation(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversation = async (contactId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setChatLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const courseQuery = courses.length > 0 ? `&courseId=${courses[0].id}` : '';
      const res = await fetch(`${apiUrl}/messages/conversation/${contactId}?r=1${courseQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
      });
      if (res.ok) {
        setConversation(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeContact) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
        body: JSON.stringify({
          receiverId: activeContact.id,
          content: messageText,
          courseId: courses.length > 0 ? courses[0].id : undefined,
        }),
      });
      if (res.ok) {
        const newMessage = await res.json();
        setConversation((prev) => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Grading Modal handlers
  const openGradingModal = (sub: any) => {
    setGradingSubmission(sub);
    const initialScores: { [key: string]: number } = {};
    sub.assignment.rubrics.forEach((rub: any) => {
      rub.criteria.forEach((crit: any) => {
        initialScores[crit.id] = crit.points; // Default to full marks
      });
    });
    setCriteriaScores(initialScores);
    setGradingCbtStatus('COMPETENT');
    setGradingFeedback('');
  };

  const handleScoreChange = (criteriaId: string, value: number, maxPoints: number) => {
    const val = Math.min(Math.max(0, value), maxPoints);
    setCriteriaScores((prev) => ({ ...prev, [criteriaId]: val }));
  };

  const submitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const scoresPayload = Object.keys(criteriaScores).map((critId) => ({
      criteriaId: critId,
      scoreEarned: criteriaScores[critId],
    }));

    try {
      const res = await fetch(`${apiUrl}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'TEACHER',
        },
        body: JSON.stringify({
          submissionId: gradingSubmission.id,
          cbtResult: gradingCbtStatus,
          feedback: gradingFeedback,
          scores: scoresPayload,
        }),
      });

      if (res.ok) {
        showToast('Үнэлгээг амжилттай хадгаллаа!');
        setGradingSubmission(null);
        loadDashboardData();
      } else {
        showToast('Үнэлгээ оруулахад алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-orange-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>Багшийн удирдлагын самбар</span>
          </div>
          <h2 className="text-xl font-black">
            Сайн байна уу, {teacherName} багш аа!
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Суралцагчдын ирүүлсэн практик даалгавруудыг стандартын рубрик шалгуураар үнэлэх болон шууд чатаар харилцах хэсэг.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'courses', label: 'Миний курсүүд', icon: BookOpen },
          { key: 'evaluations', label: 'Даалгавар шалгах', icon: ClipboardCheck },
          { key: 'chat', label: 'Сурагчидтай харилцах', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading && activeTab !== 'chat' ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ==================== TAB CONTENT: COURSES ==================== */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Танд хуваарилагдсан хичээл байхгүй байна.</p>
              ) : (
                courses.map((course) => (
                  <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-0.5 rounded border border-orange-500/20">
                          {course.code}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {course.department?.name || 'Тэнхим'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-450 mt-1 line-clamp-2">{course.description}</p>
                    </div>

                    <Link
                      href={`/teacher/courses/${course.id}`}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 py-2.5 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-200 text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Хичээлийн агуулга засах</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ==================== TAB CONTENT: EVALUATIONS ==================== */}
          {activeTab === 'evaluations' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Сурагчдын ирүүлсэн даалгавар, практик ажлууд</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Оюутан</th>
                      <th className="py-3 px-4">Даалгавар</th>
                      <th className="py-3 px-4">Илгээсэн огноо</th>
                      <th className="py-3 px-4 text-center">Оноо</th>
                      <th className="py-3 px-4 text-center">Чадамжийн үнэлгээ</th>
                      <th className="py-3 px-4 text-right">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{sub.student.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sub.student.code}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-700 dark:text-slate-350">{sub.assignment.title}</p>
                          {(sub.assets?.[0]?.asset?.publicUrl || sub.linkUrl) && (
                            <a href={(sub.assets?.[0]?.asset?.publicUrl || sub.linkUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-500 hover:underline">
                              Хавсаргасан файл үзэх
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-450">{new Date(sub.submittedAt).toLocaleDateString('mn-MN')}</td>
                        <td className="py-3 px-4 text-center font-extrabold">
                          {sub.score !== null ? `${Math.round(sub.score)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {sub.cbtResult === 'COMPETENT' ? (
                            <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-2 py-0.5 rounded">COMPETENT</span>
                          ) : sub.cbtResult === 'NOT_YET_COMPETENT' ? (
                            <span className="bg-rose-500/10 text-rose-500 font-extrabold text-[9px] px-2 py-0.5 rounded">NYC</span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-450 font-extrabold text-[9px] px-2 py-0.5 rounded">ҮНЭЛЭЭГҮЙ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openGradingModal(sub)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                          >
                            {sub.score !== null ? 'Дахин үнэлэх' : 'Үнэлэх'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: CHAT ==================== */}
          {activeTab === 'chat' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm h-[480px] flex overflow-hidden">
              {/* Contacts */}
              <div className="w-[180px] md:w-[240px] border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Суралцагчид / Харилцагчид</span>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {chatContacts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 p-3">Харилцагч олдсонгүй.</p>
                  ) : (
                    chatContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setActiveContact(contact);
                          fetchConversation(contact.id);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2 transition-all ${
                          activeContact?.id === contact.id
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-400'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-655">
                          {contact.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate leading-snug">{contact.fullName}</p>
                          <p className="text-[9px] text-slate-400 truncate">{contact.roles.join(', ')}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Frame */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/10">
                {activeContact ? (
                  <>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{activeContact.fullName}</h4>
                        <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">{activeContact.roles.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => fetchConversation(activeContact.id)}
                        className="text-[10px] font-black text-slate-450 hover:underline"
                      >
                        Шинэчлэх
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : conversation.map((msg) => {
                        const isSelf = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                              isSelf
                                ? 'bg-orange-500 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-205 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                            }`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <span className={`text-[8px] font-medium block text-right mt-1 ${isSelf ? 'text-orange-200' : 'text-slate-400'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Хариу зурвас бичих..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-850 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!messageText.trim()}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-xl transition-all"
                      >
                        Илгээх
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Сурагч сонгоно уу</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">АЖЛЫН ҮНЭЛГЭЭ ОРУУЛАХ</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {gradingSubmission.assignment.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Оюутан: {gradingSubmission.student.fullName} ({gradingSubmission.student.code})</p>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradingSubmission.content && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Сурагчийн хариулт / Тайлбар:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{gradingSubmission.content}</p>
              </div>
            )}

            <form onSubmit={submitEvaluation} className="space-y-4 text-xs">
              
              {/* Rubric metrics */}
              <div className="space-y-3">
                <span className="font-black text-slate-400 uppercase tracking-wider text-[10px] block">Стандарт рубрик шалгуурууд</span>
                
                {gradingSubmission.assignment.rubrics.map((rub: any) => (
                  <div key={rub.id} className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-[11px]">{rub.title} (Шинжилгээ)</span>
                    
                    {rub.criteria.map((crit: any) => (
                      <div key={crit.id} className="flex justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                        <span className="text-slate-650 dark:text-slate-400 leading-snug">{crit.description}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max={crit.points}
                            step="0.5"
                            value={criteriaScores[crit.id] ?? crit.points}
                            onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0, crit.points)}
                            className="w-14 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-center font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400">/ {crit.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* CBT Status Selection */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-850 pt-3">
                <label className="font-bold text-slate-650 dark:text-slate-350 block">Чадамж эзэмшсэн эсэх (CBT Status)</label>
                <select
                  value={gradingCbtStatus}
                  onChange={(e: any) => setGradingCbtStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-850 dark:text-slate-100"
                >
                  <option value="COMPETENT">Чадамж эзэмшсэн (COMPETENT - C)</option>
                  <option value="NOT_YET_COMPETENT">Хараахан эзэмшээгүй (NOT YET COMPETENT - NYC)</option>
                </select>
              </div>

              {/* Written Feedback */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-650 dark:text-slate-350 block">Бичгээр өгөх санал зөвлөмж</label>
                <textarea
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="Оюутанд туслах зөвлөмж, технологийн алдаа дутагдлыг тайлбарлан бичнэ үү..."
                  className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-bold transition-all"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/10"
                >
                  Үнэлгээг хадгалах
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
