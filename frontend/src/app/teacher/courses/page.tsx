'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, BookMarked, Search, GraduationCap } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  isCBT: boolean;
}

export default function TeacherCoursesList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const fetchCourses = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/courses`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-active-role': localStorage.getItem('activeRole') || ''
          },
        });

        if (!response.ok) {
          throw new Error('Курсуудын мэдээлэл авахад алдаа гарлаа');
        }

        const data = await response.json();
        setCourses(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Курсуудын жагсаалтыг ачаалж байна...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rose-600 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        Алдаа: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Миний курсууд</h2>
          <p className="text-xs text-slate-400">Өөрийн зааж буй курсуудыг сонгон агуулга болон сорилуудыг удирдана уу.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Хичээлийн нэр, кодоор хайх..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-450"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider">Курс олдсонгүй</p>
          <p className="text-[10px] text-slate-400 mt-1">Хайлтын утгыг шалгах эсвэл сургалтын албанаас хичээл хуваарилалтыг тодруулна уу.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                    {course.code}
                  </span>
                  {course.isCBT && (
                    <span className="text-[8px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      CBT Идэвхтэй
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {course.description || 'Хичээлийн тайлбар ороогүй байна.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>Политехник</span>
                </div>
                <Link
                  href={`/teacher/courses/${course.id}`}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-orange-500/10 active:scale-95"
                >
                  <span>Засах</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
