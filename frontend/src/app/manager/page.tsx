'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BookOpen, Megaphone, UserPlus, Users } from 'lucide-react';
import { Course, DropoutRisk, errorText, managerQueries, Student, Teacher } from '@/features/manager/api';
import { ErrorState, LoadingState, PageHeader } from '@/features/manager/ui';

export default function ManagerDashboard() {
  const [data, setData] = useState<{ courses: Course[]; teachers: Teacher[]; students: Student[]; risks: DropoutRisk[] }>();
  const [error, setError] = useState('');
  const load = async () => { setError(''); try { const [courses, teachers, students, risks] = await Promise.all([managerQueries.courses(), managerQueries.teachers(), managerQueries.students(), managerQueries.risks()]); setData({ courses, teachers, students, risks }); } catch (e) { setError(errorText(e)); } };
  useEffect(() => { void load(); }, []);
  if (!data && !error) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;
  const cards = [
    { label: 'Нийт курс', value: data!.courses.length, href: '/manager/courses', icon: BookOpen },
    { label: 'Багш', value: data!.teachers.length, href: '/manager/courses', icon: Users },
    { label: 'Суралцагч', value: data!.students.length, href: '/manager/enrollments', icon: UserPlus },
    { label: 'Өндөр эрсдэлтэй', value: data!.risks.filter((r) => r.riskStatus === 'HIGH').length, href: '/manager/risks', icon: AlertTriangle },
  ];
  return <div className="space-y-6"><PageHeader title="Хянах самбар" description="Сургалтын үйл ажиллагааны товч мэдээлэл" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, href, icon: Icon }) => <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900"><Icon className="mb-3 h-5 w-5 text-teal-500" /><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Link>)}</div><div className="grid gap-4 md:grid-cols-3"><Link href="/manager/courses/new" className="rounded-2xl bg-teal-500 p-5 text-white"><BookOpen className="mb-3 h-6 w-6"/><b>Шинэ курс үүсгэх</b><p className="mt-1 text-xs text-teal-50">Тэнхим болон үндсэн багштай нь бүртгэнэ.</p></Link><Link href="/manager/enrollments" className="rounded-2xl bg-slate-900 p-5 text-white"><UserPlus className="mb-3 h-6 w-6"/><b>Суралцагч бүртгэх</b></Link><Link href="/manager/announcements" className="rounded-2xl bg-orange-500 p-5 text-white"><Megaphone className="mb-3 h-6 w-6"/><b>Зарлал нийтлэх</b></Link></div></div>;
}
