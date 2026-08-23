'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Mail, ShieldAlert, UserCheck, CreditCard, KeyRound, Shield, ShieldCheck } from 'lucide-react';
import { InteractiveStars } from '../../../components/InteractiveStars';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [role, setRole] = useState('STUDENT');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          fullName,
          registerNumber: registerNumber || null,
          code,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Бүртгүүлэхэд алдаа гарлаа');
      }

      setSuccess('Бүртгэл амжилттай хийгдлээ! Систем рүү нэвтэрч байна...');
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        router.push('/courses');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Холболтын алдаа. Мэдээллээ дахин шалгана уу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070f1e] relative overflow-hidden p-4 md:p-8 font-sans">
      
      {/* Background Interactive Stars Network */}
      <InteractiveStars />

      {/* Centered Split-Screen Card */}
      <div className="w-full max-w-4xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl rounded-[32px] shadow-[0_25px_60px_-15px_rgba(13,148,136,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(8,112,184,0.25)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10 min-h-[620px] border border-white/20 dark:border-slate-800/40">
        
        {/* LEFT PANEL: Brand Info Column */}
        <div className="hidden md:flex md:col-span-6 bg-[#0f1d3a]/80 backdrop-blur-md relative overflow-hidden flex-col justify-between p-10 text-white border-r border-slate-200/10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
          <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full filter blur-[50px]" />

          <div className="relative z-10 space-y-1">
            <h2 className="text-sm font-black text-slate-100 leading-none">Гурван тамир</h2>
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Политехник коллеж</p>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 flex-1 py-4">
            <div className="w-24 h-24 flex items-center justify-center rounded-full shadow-lg shadow-yellow-500/20">
              <Image src="/GT-logo.png" alt="Гурван тамир лого" width={96} height={96} className="rounded-full object-contain" />
            </div>

            <div className="bg-[#1b2b4d]/85 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl w-full max-w-[280px] shadow-xl text-left">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Цахим сургалтын</h3>
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">платформ</p>
              <p className="text-[9px] text-slate-400 mt-2">Таны суралцах зам</p>
              <div className="w-full h-1.5 bg-slate-950 rounded-full mt-2 overflow-hidden">
                <div className="w-3/4 h-full bg-teal-500 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[9px] text-teal-400 font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>БҮРЭН АВТОМАТЖУУЛСАН</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="bg-[#1b2b4d]/50 border border-slate-800/40 p-4 rounded-2xl">
              <span className="text-xl font-serif text-sky-400 leading-none">“</span>
              <p className="text-xs text-slate-300 leading-relaxed font-medium -mt-1">
                Бид хөгжлийн чиг хандлагад нийцсэн хөрвөх чадвартай мэргэжилтэнг бэлтгэнэ.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-full bg-slate-500" />
                <div>
                  <p className="text-[10px] font-bold text-white leading-none">Архангай аймаг дахь</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Гурвантамир политехник коллеж</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider">
              <span>140K+ USERS</span>
              <span>•</span>
              <span>500+ INSTITUTIONS</span>
              <span>•</span>
              <span>99.7% UPTIME</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Authentication Form Column */}
        <div className="col-span-12 md:col-span-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 md:p-8 flex flex-col justify-between min-h-[550px] overflow-y-auto">
          <div />

          {/* Form content */}
          <div className="w-full max-w-md mx-auto space-y-5 my-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Шинэ бүртгэл үүсгэх</h1>
                <p className="text-xs text-slate-500">Сургуулийн цахим системд тавтай морил</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Бүтэн нэр</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Бат-Эрдэнэ Болд"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Оюутны / Ажилтны код</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="STUDENT-ELE-005"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Регистрийн дугаар</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={registerNumber}
                      onChange={(e) => setRegisterNumber(e.target.value)}
                      placeholder="ФМ05245678"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Нэвтрэх нэр</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="boldo"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Имэйл хаяг</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="boldo@email.mn"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Системд нэвтрэх эрх</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  <option value="STUDENT">Суралцагч (Student)</option>
                  <option value="TEACHER">Багш (Teacher)</option>
                  <option value="ENTERPRISE_MENTOR">Дадлагын удирдагч (Enterprise Mentor)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Нууц үг</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 px-6 rounded-xl font-bold transition-all disabled:opacity-50 mt-4 text-xs shadow-lg shadow-blue-500/10"
              >
                {loading ? 'Бүртгэл үүсгэж байна...' : 'Бүртгүүлэх'}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span>Аль хэдийн бүртгэлтэй юу? </span>
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Нэвтрэх
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex justify-center gap-4 text-[9px] text-slate-400 font-semibold pt-4 border-t border-slate-100 dark:border-slate-800">
            <span>Хэрэглэх заавар</span>
            <span>•</span>
            <span>Техникийн тусламж</span>
            <span>•</span>
            <span>Нууцлалын бодлого</span>
          </footer>
        </div>

      </div>

    </div>
  );
}
