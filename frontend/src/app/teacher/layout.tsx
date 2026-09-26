'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap, BookOpen, UserCheck, Users, LogOut, ArrowLeft,
  Menu, X, ShieldAlert, BarChart3, Settings, Bell, Compass,
  Radio, ClipboardCheck
} from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      const activeRole = localStorage.getItem('activeRole');
      const roles = parsedUser.roles || [];

      if (activeRole === 'TEACHER' && roles.includes('TEACHER')) {
        setUser(parsedUser);
      } else if (roles.includes('TEACHER')) {
        localStorage.setItem('activeRole', 'TEACHER');
        setUser(parsedUser);
      } else {
        setUnauthorized(true);
      }
    } catch (err) {
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-400 animate-pulse">Багшийн эрхийг шалгаж байна...</span>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-black mb-2">Хандах эрхгүй байна!</h1>
        <p className="text-slate-400 text-xs max-w-sm mb-6">
          Энэхүү хэсэгт зөвхөн багш, сургалтын менежер болон администратор нэвтрэх боломжтой.
        </p>
        <Link href="/courses" className="bg-orange-500 hover:bg-orange-600 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-500/20">
          Оюутны хэсэг рүү буцах
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-800 dark:text-slate-200">
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ==================== TEACHER SIDEBAR ==================== */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        w-[280px] h-screen bg-[#0F172A] text-white flex flex-col justify-between transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col">
          {/* Header Brand */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Image src="/GT-logo.png" alt="GT Logo" width={34} height={34} className="object-contain" />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-wider uppercase">ГУРВАН ТАМИР ПК</h2>
                <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">Багшийн удирдлага</p>
              </div>
            </div>
            <button className="lg:hidden p-1 hover:bg-slate-800 rounded" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { href: '/teacher', label: 'Хянах самбар', icon: BarChart3 },
              { href: '/teacher/courses', label: 'Миний курсууд', icon: BookOpen },
              { href: '/teacher/students', label: 'Оюутны явц', icon: Users },
              { href: '/teacher/grades', label: 'Дүн & Үнэлгээ', icon: ClipboardCheck },
            ].map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/teacher' && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-orange-500'}`} />
                  <span>{label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
                </Link>
              );
            })}

            <Link
              href="/teacher/library"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
            >
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>Цахим номын сан</span>
            </Link>

            {/* Live Session shortcut */}
            <div className="pt-2 border-t border-slate-800/60 mt-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 pb-1.5">Live хичээл</p>
              <Link
                href="/teacher/live"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-red-900/30 hover:text-red-400 border border-transparent hover:border-red-800/40 transition-all"
              >
                <Radio className="w-4 h-4 text-red-500" />
                <span>Live хичээл эхлүүлэх</span>
                <span className="ml-auto text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">LIVE</span>
              </Link>
            </div>

            <Link
              href="/courses"
              className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-transparent hover:border-slate-800 mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Оюутны хэсэг рүү буцах</span>
            </Link>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-black">
              {user?.fullName?.charAt(0) || 'T'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{user?.fullName || 'Багш'}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>

          {user?.roles && user.roles.length > 1 && (
            <Link
              href="/role-select"
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-350 py-2 rounded-xl text-xs font-bold transition-all mb-2"
            >
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Эрх солих (Switch Role)</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-transparent text-rose-400 hover:text-white py-2 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Системээс гарах</span>
          </button>
        </div>
      </aside>

      {/* ==================== TEACHER MAIN AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider hidden sm:inline-block">
              СУРГАЛТЫН УДЫРДЛАГЫН СИСТЕМ
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {user?.role} PANEL
            </span>
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors">
                <Bell className="w-4.5 h-4.5 text-slate-500" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

    </div>
  );
}
