'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Users, LogOut, UserPlus,
  Menu, X, ShieldAlert, BarChart3, Bell, Compass, AlertTriangle, Upload, Settings2
} from 'lucide-react';

interface ManagerUser { fullName: string; code?: string; roles: string[] }

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ManagerUser | null>(null);
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
      setLoading(false);
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as ManagerUser;
      const activeRole = localStorage.getItem('activeRole');
      const roles = parsedUser.roles || [];

      if (activeRole === 'MANAGER' && roles.includes('MANAGER')) {
        setUser(parsedUser);
      } else if (roles.includes('MANAGER')) {
        localStorage.setItem('activeRole', 'MANAGER');
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
    localStorage.removeItem('activeRole');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-400 animate-pulse">Менежерийн эрхийг шалгаж байна...</span>
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
          Энэхүү хэсэгт зөвхөн сургалтын менежер болон администратор нэвтрэх боломжтой.
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

      {/* ==================== MANAGER SIDEBAR ==================== */}
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
                <h2 className="text-xs font-black uppercase tracking-wider">ГУРВАН ТАМИР ПК</h2>
                <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Сургалтын алба</p>
              </div>
            </div>
            <button className="lg:hidden p-1 hover:bg-slate-800 rounded-lg" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { href: '/manager', label: 'Хянах самбар', icon: BarChart3 },
              { href: '/manager/library', label: 'Цахим номын сан', icon: BookOpen },
              { href: '/manager/courses', label: 'Курсын удирдлага', icon: BookOpen },
              { href: '/manager/enrollments', label: 'Суралцагч бүртгэх', icon: UserPlus },
              { href: '/manager/users/import', label: 'Excel импорт', icon: Upload },
              { href: '/manager/setup', label: 'Тохиргооны тойм', icon: Settings2 },
              { href: '/manager/departments', label: 'Тэнхим', icon: Settings2 },
              { href: '/manager/classes', label: 'Анги / бүлэг', icon: Settings2 },
              { href: '/manager/announcements', label: 'Мэдээ мэдээлэл', icon: Bell },
              { href: '/manager/risks', label: 'Явц ба эрсдэл', icon: AlertTriangle },
            ].map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/manager' && pathname.startsWith(href));
              return <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${active ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon className="w-4 h-4" /><span>{label}</span></Link>;
            })}

            {(user?.roles.length || 0) > 1 && (
              <Link
                href="/role-select"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850/50 transition-all"
              >
                <Compass className="w-4 h-4 text-slate-450" />
                <span>Эрх солих (Switch Role)</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Footer Profile / Logout */}
        <div className="p-4 border-t border-slate-850 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white text-xs">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold truncate text-white leading-tight">{user?.fullName}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{user?.code}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-500/15"
          >
            <LogOut className="w-4 h-4" />
            <span>Системээс гарах</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-650 dark:text-slate-300" />
            </button>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Сургалтын удирдлагын хэсэг
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-xs font-black">{user?.fullName}</span>
              <span className="text-[9px] text-slate-400 uppercase font-black">СУРГАЛТЫН МЕНЕЖЕР</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-350 text-xs">
              {user?.fullName?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  );
}
