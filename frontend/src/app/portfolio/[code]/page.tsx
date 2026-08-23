'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award, ShieldCheck, Landmark, User, MapPin, CheckCircle } from 'lucide-react';
import { RadarChart } from '../../../components/RadarChart';

interface SkillBadge {
  id: string;
  badgeName: string;
  criteriaMet: string;
  issuedAt: string;
}

interface PortfolioData {
  fullName: string;
  code: string;
  registerNumber: string;
  department: string;
  classGroup: string;
  badges: SkillBadge[];
  radarData: { subject: string; score: number; fullMark: number }[];
}

export default function PublicPortfolioPage() {
  const { code } = useParams();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    const fetchPortfolio = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/career/portfolio/${code}`);
        if (response.ok) {
          const portfolioData = await response.json();
          setData(portfolioData);
        } else {
          setError('Суралцагчийн мэдээлэл олдсонгүй.');
        }
      } catch (err) {
        console.error('Error fetching public portfolio:', err);
        setError('Холболтын алдаа.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Ачаалж байна...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Алдаа гарлаа</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'Портфолио уншиж чадсангүй.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Profile Card Header */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-teal-500/20 border border-teal-500/30 text-teal-400 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified E-Portfolio</span>
                </span>
                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Гурвантамир Коллеж
                </span>
              </div>
              <h1 className="text-3xl font-black">{data.fullName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-1">
                  <Landmark className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Мэргэжил: {data.department}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Анги: {data.classGroup}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl shrink-0 self-start md:self-center font-mono text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Оюутны код</p>
              <p className="text-sm font-bold text-teal-400">{data.code}</p>
            </div>
          </div>
        </div>

        {/* Competencies Analysis & Radar Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* Radar Component */}
          <RadarChart data={data.radarData} />

          {/* Acquired Skills Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Эзэмшсэн чадамжийн нэгжүүд</span>
              </h3>
              <p className="text-xs text-slate-500">Онолын болон практик үнэлгээгээр 100% баталгаажсан чадамжууд.</p>
            </div>

            <div className="space-y-4">
              {data.radarData.map((comp, idx) => (
                <div key={idx} className="space-y-2 border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-white">{comp.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      comp.score === 100 
                        ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {comp.score === 100 ? 'Чадамж эзэмшсэн (C)' : 'Явц дуусаагүй (NYC)'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${comp.score === 100 ? 'bg-teal-500' : 'bg-slate-400'}`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Micro-credentials Badges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-teal-500 shrink-0" />
              <span>Дижитал тэмдэг, сертификатууд (Micro-Credentials)</span>
            </h3>
            <p className="text-xs text-slate-500">Суралцагчийн амжилттай дүүргэсэн хичээлүүдэд олгогдсон гэрчилгээнүүд.</p>
          </div>

          {data.badges.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-xs">Одоогоор олгогдсон дижитал тэмдэг байхгүй байна.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-teal-500/50 transition-all bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">{badge.badgeName}</h4>
                    <p className="text-[10px] text-slate-500">Үндэслэл: {badge.criteriaMet}</p>
                    <p className="text-[9px] text-slate-400">Олгосон огноо: {new Date(badge.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
