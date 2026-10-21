'use client';
import React, { useEffect, useState } from 'react';
import {
  Building2, Users, ClipboardCheck, Sparkles, Check, X,
  AlertCircle, MessageSquare, Clock, RefreshCw, CheckCircle2
} from 'lucide-react';

export default function MentorDashboard() {
  const [activeTab, setActiveTab] = useState('logs');
  const [mentorName, setMentorName] = useState('Ментор');
  const [companyName, setCompanyName] = useState('');
  const [user, setUser] = useState<any>(null);

  // Data states
  const [logs, setLogs] = useState<any[]>([]);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  // Review Dialog/Modal states
  const [reviewingLog, setReviewingLog] = useState<any>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewIsApproved, setReviewIsApproved] = useState(true);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;

    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);
    setMentorName(parsedUser.fullName || 'Ментор');
    setCompanyName(parsedUser.companyName || 'ААН');

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    try {
      // 1. Fetch internship logs
      const logsRes = await fetch(`${apiUrl}/internship-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'ENTERPRISE_MENTOR',
        },
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast('Дадлагын тэмдэглэл авахад алдаа гарлаа', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch chat contacts when tab changes to chat
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatContacts();
    }
  }, [activeTab]);

  const fetchChatContacts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      const res = await fetch(`${apiUrl}/messages/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'ENTERPRISE_MENTOR',
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      const res = await fetch(`${apiUrl}/messages/conversation/${contactId}?r=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'ENTERPRISE_MENTOR',
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'ENTERPRISE_MENTOR',
        },
        body: JSON.stringify({
          receiverId: activeContact.id,
          content: messageText,
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

  // Submit Internship Log review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLog) return;

    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    try {
      const res = await fetch(`${apiUrl}/internship-logs/${reviewingLog.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'ENTERPRISE_MENTOR',
        },
        body: JSON.stringify({
          isApproved: reviewIsApproved,
          mentorFeedback: reviewFeedback,
        }),
      });

      if (res.ok) {
        showToast('Дадлагын тайланг амжилттай шалгаж баталгаажууллаа!');
        setReviewingLog(null);
        loadData();
      } else {
        showToast('Тайлан үнэлэхэд алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-teal-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>ААН менторын удирдлагын хэсэг</span>
          </div>
          <h2 className="text-xl font-black">
            Сайн байна уу, {mentorName} ментор оо!
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Дадлагажигч оюутнуудын үйлдвэр дээр хийсэн өдрийн тайлангуудыг шалгаж баталгаажуулах, зөвлөмж оруулах болон чатаар харилцах хэсэг.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase">НИЙТ ДАДЛАГЫН ЦАГ</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {logs.filter(l => l.isApproved).reduce((sum, log) => sum + log.hoursWorked, 0)} цаг
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase">ХЯНАГДАЖ БАТЛАГДСАН</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {logs.filter(l => l.isApproved).length} тайлан
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase">ХҮЛЭЭГДЭЖ БУЙ</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {logs.filter(l => !l.isApproved).length} тайлан
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'logs', label: 'Дадлагын тэмдэглэл', icon: Building2 },
          { key: 'chat', label: 'Оюутнуудтай чатлах', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-650'
                  : 'border-transparent text-slate-400 hover:text-slate-655'
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
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ==================== TAB CONTENT: LOGS ==================== */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Оюутнуудын өдрийн тайлан</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Оюутан</th>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4 text-center">Цаг</th>
                      <th className="py-3 px-4">Ажлын хураангуй (Work Summary)</th>
                      <th className="py-3 px-4 text-center">ХАБЭА дүрэм</th>
                      <th className="py-3 px-4 text-center">Төлөв</th>
                      <th className="py-3 px-4 text-right">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{log.student.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.student.code}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-450 font-medium">
                          {new Date(log.logDate).toLocaleDateString('mn-MN')}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold">{log.hoursWorked} цаг</td>
                        <td className="py-3 px-4 max-w-xs truncate" title={log.workSummary}>
                          {log.workSummary}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.safetyFollowed ? (
                            <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-2 py-0.5 rounded">МӨРДСӨН</span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ЗӨРЧСӨН</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.isApproved ? (
                            <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-2 py-0.5 rounded">БАТЛАГДСАН</span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ХҮЛЭЭГДЭЖ БУЙ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setReviewingLog(log);
                              setReviewFeedback(log.mentorFeedback || '');
                              setReviewIsApproved(log.isApproved);
                            }}
                            className="bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                          >
                            Хянах
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
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Суралцагчдын жагсаалт</span>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {chatContacts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 p-3">Харилцагч оюутан байхгүй байна.</p>
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

              {/* Chat frame */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/10">
                {activeContact ? (
                  <>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">{activeContact.fullName}</h4>
                        <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest">{activeContact.roles.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => fetchConversation(activeContact.id)}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-600 hover:underline"
                      >
                        Шинэчлэх
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : conversation.map((msg) => {
                        const isSelf = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                              isSelf
                                ? 'bg-teal-650 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-205 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                            }`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <span className={`text-[8px] font-medium block text-right mt-1 ${isSelf ? 'text-teal-200' : 'text-slate-400'}`}>
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
                        placeholder="Оюутанд заавар зөвлөмж илгээх..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!messageText.trim()}
                        className="bg-teal-500 hover:bg-teal-650 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-xl transition-all"
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

      {/* Review Dialog Modal */}
      {reviewingLog && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest">ДАДЛАГЫН ТАЙЛАН ХЯНАХ</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  Өдрийн тайлан шалгах
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Оюутан: {reviewingLog.student.fullName} ({reviewingLog.student.code})</p>
              </div>
              <button
                onClick={() => setReviewingLog(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Ажилласан огноо:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(reviewingLog.logDate).toLocaleDateString('mn-MN')}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Хугацаа:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{reviewingLog.hoursWorked} цаг</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Ажлын тайлан хураангуй:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed mt-1 font-medium">{reviewingLog.workSummary}</p>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              
              {/* Approval status toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-650 dark:text-slate-350 block">Төлөв (Approval Status)</label>
                <select
                  value={reviewIsApproved ? 'true' : 'false'}
                  onChange={(e) => setReviewIsApproved(e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                >
                  <option value="true">Батлах (Approve)</option>
                  <option value="false">Буцаах / Засварт оруулах (Reject)</option>
                </select>
              </div>

              {/* Written Mentor Feedback */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-650 dark:text-slate-350 block">Дадлага удирдагчийн санал зөвлөмж</label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Хөдөлмөрийн ажиллагааны дүрэм мөрдөлт, гүйцэтгэлийн талаарх сэтгэгдлээ бичнэ үү..."
                  className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingLog(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-bold transition-all"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-500 hover:bg-teal-650 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10"
                >
                  Хадгалах
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
