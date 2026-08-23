'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, Trophy, Star, ShieldCheck } from 'lucide-react';

interface LeaderboardItem {
  rank: number;
  id: string;
  fullName: string;
  code: string;
  points: number;
  badgesCount: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/career/gamification/leaderboard`);
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
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
            <h1 className="font-bold text-sm leading-tight">Тэргүүлэгчдийн самбар</h1>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Сургалтын амжилт</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full py-12 px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Суралцагчдын Тэргүүлэл</h2>
            <p className="text-xs text-slate-500">Нийт чадамжийн нэгж эзэмшилт, сорилууд, болон өдрийн дадлага бүртгэлээр тооцсон оноо.</p>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-slate-500 text-sm">Одоогоор оноо цуглуулсан суралцагч байхгүй байна.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((item) => {
                // Style for top 3
                const isGold = item.rank === 1;
                const isSilver = item.rank === 2;
                const isBronze = item.rank === 3;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        {isGold && (
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-black text-sm border border-amber-200/50">
                            🥇
                          </div>
                        )}
                        {isSilver && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black text-sm border border-slate-200/50">
                            🥈
                          </div>
                        )}
                        {isBronze && (
                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-black text-sm border border-orange-200/50">
                            🥉
                          </div>
                        )}
                        {!isGold && !isSilver && !isBronze && (
                          <span className="text-slate-400 font-bold text-sm">#{item.rank}</span>
                        )}
                      </div>

                      {/* Student Info */}
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                          <span>{item.fullName}</span>
                          {item.badgesCount > 0 && (
                            <span
                              className="text-[9px] bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5"
                              title={`${item.badgesCount} чадамжийн тэмдэгтэй`}
                            >
                              <Star className="w-2.5 h-2.5 fill-teal-500 text-teal-500" />
                              <span>{item.badgesCount}</span>
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">{item.code}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{item.points} оноо</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Амжилт</p>
                    </div>
                  </div>
                );
              })}
            </div>
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
