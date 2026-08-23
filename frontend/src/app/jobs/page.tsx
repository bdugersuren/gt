'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, ArrowLeft, MapPin, Landmark, DollarSign, Percent, Award } from 'lucide-react';

interface JobVacancy {
  id: string;
  title: string;
  companyName: string;
  description: string;
  location: string;
  salary: string;
  requiredSkills: string[];
  matchPercent: number;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchJobs = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/career/match-jobs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Sort by matchPercent descending
          data.sort((a: JobVacancy, b: JobVacancy) => b.matchPercent - a.matchPercent);
          setJobs(data);
        }
      } catch (err) {
        console.error('Error fetching matched jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Ачаалж байна...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/courses" className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-sm leading-tight">Ажлын байрны зуучлал</h1>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Ухаалаг тохироо</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full py-12 px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Тохирох ажлын байрууд</h2>
            <p className="text-xs text-slate-500">Таны эзэмшсэн чадамжийн нэгжүүд дээр үндэслэн тохирох ажлын байруудыг санал болгож байна.</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-slate-500 text-sm">Одоогоор зарлагдсан ажлын байр олдсонгүй.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-teal-500 transition-all group"
              >
                <div className="space-y-3 flex-1">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>{job.companyName}</span>
                    </p>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-2xl">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{job.salary}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Шаардагдах чадамжууд:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill, i) => (
                        <span key={i} className="text-[10px] font-bold bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-100/50 dark:border-teal-900/50">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50 min-w-[120px] shrink-0 self-start md:self-center">
                  <div className="relative w-12 h-12 flex items-center justify-center mb-1 text-teal-600 dark:text-teal-400">
                    <Percent className="w-5 h-5 absolute" />
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeWidth="3.5"
                        fill="transparent"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-teal-500"
                        strokeWidth="3.5"
                        fill="transparent"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 - (125.6 * job.matchPercent) / 100}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black">{job.matchPercent}%</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Тохироо</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        © 2026 "Гурвантамир" Политехник Коллеж LMS
      </footer>
    </div>
  );
}
