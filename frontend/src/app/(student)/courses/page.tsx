'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BookOpen, LogOut, ArrowRight, ClipboardList, User, RefreshCw, AlertTriangle,
  TrendingUp, Award, Activity, Briefcase, Search, Bell, ChevronLeft, ChevronRight,
  Settings, Beaker, GraduationCap, BarChart3, FileText, Menu, X, Calendar,
  Clock, CheckCircle2, Shield, Star
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  coverImage?: string;
  teacher?: { fullName: string };
  teachers?: { fullName: string }[];
  progressPercent?: number;
}

// Simple mini-calendar component
function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();

  const monthNames = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  const dayNames = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { day: number; current: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, current: false });
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
          {monthNames[month]}, {year}
        </h4>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map(d => (
          <div key={d} className="text-[9px] font-bold text-slate-400 uppercase py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`text-[10px] py-1.5 rounded-lg font-semibold transition-colors cursor-default ${
              !cell.current
                ? 'text-slate-300 dark:text-slate-700'
                : cell.day === dayOfMonth
                ? 'bg-orange-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}

// Circular progress component
function CircularProgress({ percent, size = 80, strokeWidth = 6, color = '#f97316' }: {
  percent: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-700 ease-out" />
    </svg>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [dropoutRisks, setDropoutRisks] = useState<any[]>([]);
  const [syncingEsis, setSyncingEsis] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [gameStats, setGameStats] = useState<any>({ points: 0, streak: 0, ranking: 0 });
  const [activeTab, setActiveTab] = useState('enrolled');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    const fetchData = async () => {
      try {
        const coursesRes = await fetch(`${apiUrl}/courses`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-active-role': localStorage.getItem('activeRole') || ''
          },
        });
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData);
        }

        if (parsedUser.roles?.includes('STUDENT')) {
          const dashboardRes = await fetch(apiUrl + '/students/me/dashboard', {
            headers: { 'Authorization': 'Bearer ' + token },
          });
          if (dashboardRes.ok) {
            const dashboard = await dashboardRes.json();
            setCourses(dashboard.courses || []);
          }
          const compRes = await fetch(`${apiUrl}/users/profile/competency`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (compRes.ok) {
            const compData = await compRes.json();
            setCompetencies(compData);
          }

          const statsRes = await fetch(`${apiUrl}/career/gamification/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setGameStats(statsData);
          }
        } else if (parsedUser.roles?.includes('MANAGER') || parsedUser.roles?.includes('ADMIN')) {
          const dropoutRes = await fetch(`${apiUrl}/users/students/dropout-risk`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (dropoutRes.ok) {
            const dropoutData = await dropoutRes.json();
            setDropoutRisks(dropoutData);
          }
        }
      } catch (err) {
        console.error('Data fetching error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEsisSync = async () => {
    setSyncingEsis(true);
    setSyncMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/esis/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSyncMessage(`Синк амжилттай! (${data.recordsCount} суралцагч)`);
        const dropoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/students/dropout-risk`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (dropoutRes.ok) {
          const dropoutData = await dropoutRes.json();
          setDropoutRisks(dropoutData);
        }
      } else {
        setSyncMessage('Синк хийхэд алдаа гарлаа.');
      }
    } catch (err) {
      setSyncMessage('Холболтын алдаа.');
    } finally {
      setSyncingEsis(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 animate-pulse">Ачаалж байна...</span>
        </div>
      </div>
    );
  }

  const sidebarNavItems = [
    { icon: BookOpen, label: 'Миний курсуд', href: '/courses', active: true },
    { icon: Beaker, label: 'Практик лабораторь', href: '/lab' },
    { icon: BarChart3, label: 'Дүнгүүд', href: '/grades' },
    { icon: ClipboardList, label: 'Дадлагын бүртгэл', href: '/internship-logs' },
    { icon: BookOpen, label: 'Цахим номын сан', href: '/library' },
    { icon: Settings, label: 'Тохиргоо', href: '/settings' },
  ];

  // Demo data for course images
  const courseImages = [
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=250&fit=crop',
  ];

  const featuredCourse = courses.length > 0 ? courses[0] : null;

  const tabs = [
    { key: 'enrolled', label: 'Суралцаж байгаа', count: courses.filter((course: any) => (course.progressPercent ?? 0) < 100).length },
    { key: 'upcoming', label: 'Удахгүй нээгдэх', count: 0 },
    { key: 'completed', label: 'Судалсан', count: courses.filter((course: any) => (course.progressPercent ?? 0) >= 100).length },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-950 flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ========== LEFT SIDEBAR ========== */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        w-[240px] h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & User */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center shrink-0">
              <Image src="/GT-logo.png" alt="GT Logo" width={40} height={40} className="object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">ГУРВАН ТАМИР</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ПК / Технологийн Коллеж</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.fullName || 'Хэрэглэгч'}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.roles?.includes('STUDENT') ? `Оюутан • ${user?.code || ''}` : user?.roles?.[0]}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                item.active
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Гарах</span>
          </button>
        </div>
      </aside>

      {/* ========== MAIN AREA (center + right) ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Хичээлийн код хайх..."
                  className="pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:block text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                2025-2026 Намрын улирал
              </span>
              <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <Bell className="w-4.5 h-4.5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {user?.fullName?.split(' ')[0] || 'User'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex">
          {/* ===== CENTER MAIN CONTENT ===== */}
          <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto min-w-0">

            {/* Admin/Manager ESIS Sync Panel */}
            {(user?.roles?.includes('MANAGER') || user?.roles?.includes('ADMIN')) && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-teal-500/25 border border-teal-500/35 text-teal-400 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                          Улсын нэгдсэн систем
                        </span>
                      </div>
                      <h2 className="text-xl font-black">ESIS (TVET-MIS) Синхрончлол</h2>
                      <p className="text-slate-400 text-xs max-w-md">
                        Суралцагчдын мэдээллийг БСШУЯ-ны мэдээллийн сан руу синк хийнэ.
                      </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                      <button
                        onClick={handleEsisSync}
                        disabled={syncingEsis}
                        className="bg-teal-500 hover:bg-teal-600 active:scale-95 text-white py-3 px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all text-xs"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingEsis ? 'animate-spin' : ''}`} />
                        <span>{syncingEsis ? 'Синк хийж байна...' : 'ESIS рүү илгээх'}</span>
                      </button>
                      {syncMessage && (
                        <span className="text-xs font-semibold text-teal-400 animate-pulse">{syncMessage}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropout Risk Table */}
                {dropoutRisks.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Эрсдэлийн самбар</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <th className="pb-3">Нэр / Код</th>
                            <th className="pb-3">Эрсдэл</th>
                            <th className="pb-3">Төлөв</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {dropoutRisks.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <td className="py-3">
                                <p className="font-bold text-slate-900 dark:text-white text-xs">{student.fullName}</p>
                                <p className="text-[10px] text-slate-400">{student.code}</p>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">{student.riskScore}%</span>
                                  <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        student.riskStatus === 'HIGH' ? 'bg-rose-500' :
                                        student.riskStatus === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${student.riskScore}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                                  student.riskStatus === 'HIGH'
                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                    : student.riskStatus === 'MEDIUM'
                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                  {student.riskStatus === 'HIGH' ? 'Өндөр' : student.riskStatus === 'MEDIUM' ? 'Дунд' : 'Бага'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== HERO BANNER (Featured Course) ===== */}
            {featuredCourse && (
              <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 rounded-2xl p-5 md:p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 backdrop-blur text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                        ШИНЭ
                      </span>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                        ҮРГЭЛЖЛҮҮЛЭН СУРАЛЦАХ
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black leading-tight">
                      {featuredCourse.title}
                    </h2>
                    <p className="text-xs text-white/80">
                      Багш: {featuredCourse.teacher?.fullName || 'Б.Батболд (Доктор, Дэд Проф.)'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/70">
                      <Calendar className="w-3 h-3" />
                      <span>Дараагийн даалгавар: 10-р сарын 22</span>
                    </div>
                    <Link href={`/courses/${featuredCourse.id}`}>
                      <button className="mt-2 bg-white text-orange-600 hover:bg-orange-50 active:scale-95 py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-orange-700/20">
                        <span>Үргэлжлүүлэн суралцах</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>

                  {/* Circular progress */}
                  <div className="relative shrink-0">
                    <CircularProgress percent={68} size={90} strokeWidth={7} color="#fff" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black">68%</span>
                      <span className="text-[8px] font-bold opacity-70">явц</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] mt-3 text-white/60 font-semibold">
                  Нийт 12 хичээлээс 8
                </p>
              </div>
            )}

            {/* ===== TABS ===== */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                      activeTab === tab.key
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab.label} <span className="ml-1 opacity-60">{tab.count}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Эрэмбэлэх
                </button>
                <button className="text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Хүлээлгэгч
                </button>
              </div>
            </div>

            {/* ===== COURSE CARDS GRID ===== */}
            {courses.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-semibold">Та одоогоор ямар нэг хичээлд бүртгэгдээгүй байна.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {courses.map((course, idx) => {
                  const progress = course.progressPercent ?? 0;
                  const imgUrl = course.coverImage || courseImages[idx % courseImages.length];

                  return (
                    <div
                      key={course.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600 transition-all group"
                    >
                      {/* Card image */}
                      <div className="relative h-32 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>

                      {/* Card body */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                            {course.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Багш: {course.teachers?.[0]?.fullName || course.teacher?.fullName || 'Багш хуваарилагдаагүй'}
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-orange-500">Явц</span>
                            <span className="text-slate-600 dark:text-slate-400">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Серверийн progress-тэй синк хийгдсэн
                          </span>
                        </div>

                        {/* Action button */}
                        <Link href={`/courses/${course.id}`}>
                          <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/10">
                            <span>Үргэлжлүүлэх</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* ===== RIGHT SIDEBAR ===== */}
          <aside className="hidden xl:block w-[280px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4 space-y-4 overflow-y-auto h-[calc(100vh-57px)] sticky top-[57px]">

            {/* Progress stats */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Даалгаврын явц</h4>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <CircularProgress percent={50} size={60} strokeWidth={5} color="#f97316" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-800 dark:text-white">50%</span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">120<span className="text-slate-400 text-sm">/240 цаг</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">Хагас жилийн хорогтийг давдаад байна</p>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <MiniCalendar />

            {/* Teacher Grades & Reviews */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Багшийн үнэлгээ, зөвлөмж</h4>

              {competencies.length > 0 ? (
                competencies.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{comp.subject}</p>
                        <p className="text-[9px] text-slate-400 line-clamp-2 mt-0.5">{comp.feedback || 'Тайлбар хүлээж байна'}</p>
                      </div>
                      <span className="text-xs font-bold text-orange-500">{comp.score}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Д.Төмөрбаатар (Металл технологи)</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                      &quot;Лабораторийн тайлан чанартай сайн байтгасан байна. Дараагийн практик дээр авхүүлгийн жишээнүүдийг задарчилгаатай сайтар бариматлаа уу.&quot;
                    </p>
                    <span className="text-[9px] text-orange-400 font-bold mt-1 block">2 өдрийн өмнө</span>
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Г.Саруул (Зурах зүй)</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                      &quot;3D проекцийн зурагийн алгаууд нарийн, стандартын дагуу гүйцэтгэгдсэн байна. Маш сайн ажилласан.&quot;
                    </p>
                    <span className="text-[9px] text-orange-400 font-bold mt-1 block">2 өдрийн өмнө</span>
                  </div>
                </>
              )}
            </div>

            {/* Gamification stats (for students) */}
            {user?.roles?.includes('STUDENT') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-orange-500" />
                  Амжилтын оноо
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Оноо</p>
                    <p className="text-sm font-black text-orange-500">{gameStats.points}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Идэвх 🔥</p>
                    <p className="text-sm font-black text-amber-600">{gameStats.streak}д</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Ранк</p>
                    <p className="text-sm font-black text-indigo-500">#{gameStats.ranking}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around safe-area-pb">
        {[
          { icon: BookOpen, label: 'Эхлэл', href: '/courses', active: true },
          { icon: Beaker, label: 'Хичээлүүд', href: '/lab' },
          { icon: BarChart3, label: 'Хянах', href: '/grades' },
          { icon: User, label: 'Профайл', href: '/profile' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              item.active ? 'text-orange-500' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
