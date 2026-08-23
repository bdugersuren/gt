import React from 'react';
import Link from 'next/link';
import { BookOpen, Award, WifiOff, ArrowRight, ShieldCheck, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-brand-navy-dark border-b border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center font-bold text-lg text-white shadow-md shadow-brand-teal/20">
            GT
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight">Гурвантамир Коллеж</h1>
            <p className="text-xs text-brand-teal-light font-medium tracking-wider uppercase">LMS Платформ</p>
          </div>
        </div>
        
        <Link href="/login">
          <button className="bg-brand-teal hover:bg-brand-teal-dark active:scale-95 transition-all text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-brand-teal/15">
            <span>Нэвтрэх</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 bg-gradient-to-b from-brand-navy-dark to-brand-navy-dark via-slate-900 py-16 px-6 md:px-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-navy/15 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-teal/10 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="max-w-4xl relative z-10">
          <span className="bg-slate-800/80 border border-slate-700/50 text-brand-teal-light text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 inline-block">
            Архангай аймаг дахь Политехник Коллеж
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Чадамжид суурилсан <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal-light to-blue-400">
              Зайн & Холимог Сургалтын
            </span> систем
          </h2>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Мэргэжлийн боловсрол, сургалтын (VET) стандартын дагуу чадамжийн нэгж, элементүүдийг эзэмших, үйлдвэрлэлийн дадлагыг хянах систем.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full bg-brand-teal hover:bg-brand-teal-dark active:scale-95 transition-all text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center space-x-3 shadow-xl shadow-brand-teal/20">
                <span>Сургалтын системд нэвтрэх</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 text-white px-8 py-3.5 rounded-xl font-bold">
              Танилцуулга үзэх
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 w-full">
          {/* Card 1 */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl hover:border-brand-teal/50 transition-all group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 text-left">CBT / CBA Тохирол</h3>
            <p className="text-slate-400 text-sm text-left leading-relaxed">
              Чадамжид суурилсан сургалт, үнэлгээний стандарт (Чадамжийн нэгж, элемент)-ийн дагуу оюутны мэдлэг, практик чадварыг үнэлнэ.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl hover:border-brand-teal/50 transition-all group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 text-left">Хосмог Тогтолцоо</h3>
            <p className="text-slate-400 text-sm text-left leading-relaxed">
              Аж ахуйн нэгжийн дадлага удирдагч (Enterprise Mentor) системд шууд нэвтэрч, оюутны өдөр тутмын дадлагын дэвтрийг хянан үнэлнэ.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl hover:border-brand-teal/50 transition-all group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 text-left">Офлайн горим (PWA)</h3>
            <p className="text-slate-400 text-sm text-left leading-relaxed">
              Хөдөө сум, багийн сүлжээгүй орчинд оюутан хичээлүүд болон тестийг офлайн үзэх боломжтой бөгөөд сүлжээ ороход автоматаар sync хийнэ.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-navy-dark border-t border-slate-800 py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs gap-4">
        <div>
          <p>© 2026 Архангай аймаг дахь "Гурвантамир" Политехник Коллеж.</p>
          <p className="text-slate-600 mt-1">Домэйн хаяг: https://gurvantamir.know.mn</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-brand-teal">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">ESIS / TVET-MIS Нийцэлтэй</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
