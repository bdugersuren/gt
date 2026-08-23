'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, BookOpen, Users, Compass, Shield, User } from 'lucide-react';
import { InteractiveStars } from '../../../components/InteractiveStars';

interface RoleOption {
  role: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  url: string;
}

export default function RoleSelectPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setUserName(user.fullName || '');
      setRoles(user.roles || []);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const roleOptions: Record<string, RoleOption> = {
    STUDENT: {
      role: 'STUDENT',
      title: 'Суралцагч',
      description: 'Хичээл судлах, сорил ажиллах болон явцаа хянах',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'from-orange-500 to-amber-500 shadow-orange-500/20 text-orange-500',
      url: '/courses',
    },
    TEACHER: {
      role: 'TEACHER',
      title: 'Багш',
      description: 'Хичээлийн агуулга оруулах, сурагчдыг үнэлэх',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-indigo-500 shadow-blue-500/20 text-blue-500',
      url: '/teacher',
    },
    ENTERPRISE_MENTOR: {
      role: 'ENTERPRISE_MENTOR',
      title: 'Дадлага удирдагч',
      description: 'Оюутнуудын үйлдвэрийн дадлагыг рубрикээр үнэлэх',
      icon: <Compass className="w-8 h-8" />,
      color: 'from-teal-500 to-emerald-500 shadow-teal-500/20 text-teal-500',
      url: '/mentor',
    },
    MANAGER: {
      role: 'MANAGER',
      title: 'Сургалтын алба',
      description: 'Курс үүсгэх, багш сурагч хуваарилах, явц хянах',
      icon: <ShieldCheck className="w-8 h-8" />,
      color: 'from-purple-500 to-violet-500 shadow-purple-500/20 text-purple-500',
      url: '/manager',
    },
    ADMIN: {
      role: 'ADMIN',
      title: 'Системийн админ',
      description: 'Системийн лог харах, өгөгдөл нөөцлөх',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-rose-500 to-red-500 shadow-rose-500/20 text-rose-500',
      url: '/admin',
    },
  };

  const handleSelectRole = (role: string, url: string) => {
    localStorage.setItem('activeRole', role);
    router.push(url);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070f1e] relative overflow-hidden p-4 md:p-8 font-sans">
      <InteractiveStars />

      <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden p-8 md:p-12 relative z-10 border border-white/20 dark:border-slate-800/40 text-center space-y-8">
        
        <div className="space-y-2">
          <span className="bg-slate-800/80 border border-slate-700/50 text-teal-400 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-2 inline-block">
            Гурвантамир Политехник Коллеж
          </span>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Нэвтрэх дүрээ сонгоно уу
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Сайн байна уу, {userName}? Та дараах дүрүүдээс сонгон хянах самбарт нэвтэрнэ үү.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {roles.map((r) => {
            const option = roleOptions[r];
            if (!option) return null;
            return (
              <button
                key={r}
                onClick={() => handleSelectRole(option.role, option.url)}
                className="group relative bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-3xl p-6 text-left transition-all active:scale-98 shadow-sm flex flex-col justify-between h-48 hover:shadow-lg"
              >
                {/* Icon Circle */}
                <div className={`w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-105 ${option.color.split(' ').slice(-1)[0]}`}>
                  {option.icon}
                </div>

                <div className="space-y-1 mt-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{option.title}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('activeRole');
              router.push('/login');
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Өөр хаягаар нэвтрэх
          </button>
        </div>
      </div>
    </div>
  );
}
