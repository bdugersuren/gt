'use client';
import React, { useEffect, useState } from 'react';
import {
  BookOpen, PlusCircle, UserPlus, Users, Bell, AlertTriangle, Check, CheckCircle2, RefreshCw
} from 'lucide-react';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('courses');

  // Backend Data States
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [dropoutRisks, setDropoutRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseDept, setCourseDept] = useState('VET-AGR');

  // Teacher assign form
  const [assignCourseId, setAssignCourseId] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Student enroll form
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Announcement form
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceRole, setAnnounceRole] = useState('ALL');

  // Feedback notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      // 1. Fetch courses
      const courseRes = await fetch(`${apiUrl}/courses`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-active-role': 'MANAGER' },
      });
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data);
        if (data.length > 0) {
          setAssignCourseId(data[0].id);
          setEnrollCourseId(data[0].id);
        }
      }

      // 2. Fetch teachers
      const teacherRes = await fetch(`${apiUrl}/users/role/TEACHER`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (teacherRes.ok) {
        setTeachers(await teacherRes.json());
      }

      // 3. Fetch students
      const studentRes = await fetch(`${apiUrl}/users/role/STUDENT`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (studentRes.ok) {
        const data = await studentRes.json();
        setStudents(data);
        if (data.length > 0) {
          setEnrollStudentId(data[0].id);
        }
      }

      // 4. Fetch dropout risks
      const riskRes = await fetch(`${apiUrl}/users/students/dropout-risk`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (riskRes.ok) {
        setDropoutRisks(await riskRes.json());
      }

    } catch (err) {
      console.error(err);
      showToast('Мэдээлэл татахад алдаа гарлаа', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected teachers checkboxes when assign course selection changes
  useEffect(() => {
    if (assignCourseId) {
      const activeCourse = courses.find((c) => c.id === assignCourseId);
      if (activeCourse?.teachers) {
        setSelectedTeacherIds(activeCourse.teachers.map((t: any) => t.id));
      } else {
        setSelectedTeacherIds([]);
      }
    }
  }, [assignCourseId, courses]);

  // Handle Course Creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle || !courseCode) return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      // Find department ID (mock find dept Agr or Ele)
      const deptCode = courseDept;
      // We will fetch courses list to get departmentId of existing course with that deptCode
      const matchCourse = courses.find(c => c.department?.code === deptCode);
      const departmentId = matchCourse?.department?.id || 'dept-id-placeholder';

      const res = await fetch(`${apiUrl}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'MANAGER',
        },
        body: JSON.stringify({
          title: courseTitle,
          code: courseCode,
          description: courseDesc,
          departmentId,
        }),
      });

      if (res.ok) {
        showToast('Хичээл амжилттай үүсгэгдлээ!');
        setCourseTitle('');
        setCourseCode('');
        setCourseDesc('');
        fetchData(); // Reload
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Хичээл үүсгэхэд алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  // Handle Teacher Assignment
  const handleAssignTeachers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseId) return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const res = await fetch(`${apiUrl}/courses/${assignCourseId}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'MANAGER',
        },
        body: JSON.stringify({
          teacherIds: selectedTeacherIds,
        }),
      });

      if (res.ok) {
        showToast('Багш нарыг амжилттай хуваарилж шинэчлэлээ!');
        fetchData();
      } else {
        showToast('Багш хуваарилахад алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  // Handle Student Enrollment
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollCourseId || !enrollStudentId || !startDate || !endDate) {
      showToast('Бүх талбарыг бөглөнө үү', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const res = await fetch(`${apiUrl}/courses/${enrollCourseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'MANAGER',
        },
        body: JSON.stringify({
          type: 'INDIVIDUAL',
          studentId: enrollStudentId,
          startDate,
          endDate,
        }),
      });

      if (res.ok) {
        showToast('Оюутныг амжилттай бүртгэж суралцууллаа!');
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Бүртгэл хийхэд алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  // Handle Announcement Posting
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceContent) return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const targetRole = announceRole === 'ALL' ? null : announceRole;

      const res = await fetch(`${apiUrl}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'MANAGER',
        },
        body: JSON.stringify({
          title: announceTitle,
          content: announceContent,
          targetRole,
        }),
      });

      if (res.ok) {
        showToast('Зарлалыг амжилттай нийтэллээ!');
        setAnnounceTitle('');
        setAnnounceContent('');
      } else {
        showToast('Зарлал нийтлэхэд алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    }
  };

  const handleTeacherCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTeacherIds((prev) => [...prev, id]);
    } else {
      setSelectedTeacherIds((prev) => prev.filter((tid) => tid !== id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold text-white transition-all transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/10' : 'bg-rose-500 border-rose-400 shadow-rose-500/10'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-450 uppercase">НИЙТ КУРС</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{courses.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-450 uppercase">СУРАЛЦАГЧИД</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{students.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-450 uppercase">МЭРГЭЖЛИЙН БАГШ</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{teachers.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-450 uppercase">ЭРСДЭЛТЭЙ СУРАГЧИД</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {dropoutRisks.filter((r) => r.riskStatus === 'HIGH').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'courses', label: 'Хичээл & Багш', icon: BookOpen },
          { key: 'enroll', label: 'Сурагчид бүртгэх', icon: UserPlus },
          { key: 'announce', label: 'Зарлан мэдээлэл', icon: Bell },
          { key: 'risk', label: 'Явц & Dropout Эрсдэл', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading animation */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Ачааллаж байна...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ==================== TAB CONTENT: COURSES & TEACHERS ==================== */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Creator Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-teal-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Шинэ курс үүсгэх</h3>
                </div>
                <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Курсын нэр (Монгол хэлээр)</label>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="e.g. Хөдөлгүүрийн засвар оношилгоо"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Курсын код</label>
                      <input
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="e.g. VET-AUT-101"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 dark:text-slate-300">Тэнхим</label>
                      <select
                        value={courseDept}
                        onChange={(e) => setCourseDept(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                      >
                        <option value="VET-AGR">Хөдөө аж ахуй (Мал эмнэлэг)</option>
                        <option value="VET-ELE">Барилгын цахилгаан</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Тодорхойлолт</label>
                    <textarea
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                      placeholder="Курсын суралцах зорилго, чадамжийн нэгжүүдийг тайлбарлана уу..."
                      className="w-full h-24 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10"
                  >
                    Шинэ курс үүсгэх
                  </button>
                </form>
              </div>

              {/* Teacher Assign Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Курст багш хуваарилах (Олон багш боломжтой)</h3>
                </div>
                <form onSubmit={handleAssignTeachers} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Курс сонгох</label>
                    <select
                      value={assignCourseId}
                      onChange={(e) => setAssignCourseId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Заах эрхтэй багш нар сонгох</label>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                      {teachers.map((teacher) => (
                        <label key={teacher.id} className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedTeacherIds.includes(teacher.id)}
                            onChange={(e) => handleTeacherCheckboxChange(teacher.id, e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                          />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">{teacher.fullName}</p>
                            <p className="text-[9px] text-slate-450 leading-tight font-mono">{teacher.code}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10"
                  >
                    Холболтыг хадгалах
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: ENROLL STUDENTS ==================== */}
          {activeTab === 'enroll' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Сурагч хичээлд бүртгэх</h3>
              </div>
              <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Курс сонгох</label>
                  <select
                    value={enrollCourseId}
                    onChange={(e) => setEnrollCourseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Оюутан сонгох</label>
                  <select
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} ({student.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Суралцаж эхлэх огноо</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Дуусах огноо</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10"
                >
                  Оюутныг бүртгэх
                </button>
              </form>
            </div>
          )}

          {/* ==================== TAB CONTENT: ANNOUNCEMENTS ==================== */}
          {activeTab === 'announce' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Шинэ зарлан мэдээлэл оруулах</h3>
              </div>
              <form onSubmit={handlePostAnnouncement} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Зарлалын гарчиг</label>
                  <input
                    type="text"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="e.g. Мал эмнэлгийн дадлагын аюулгүй ажиллагааны журам шинэчлэгдлээ"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Хүргэх зорилтот дүр (Target Role)</label>
                  <select
                    value={announceRole}
                    onChange={(e) => setAnnounceRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                  >
                    <option value="ALL">Бүх хэрэглэгчид (General)</option>
                    <option value="STUDENT">Зөвхөн Суралцагчид (Students)</option>
                    <option value="TEACHER">Зөвхөн Багш нарт (Teachers)</option>
                    <option value="ENTERPRISE_MENTOR">Зөвхөн Ментор/Дадлага олгогчид (Mentors)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Зарлалын агуулга</label>
                  <textarea
                    value={announceContent}
                    onChange={(e) => setAnnounceContent(e.target.value)}
                    placeholder="Сурагч, багш нарт хүргэх мэдээллээ энд бичнэ үү..."
                    className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-850 dark:text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10"
                >
                  Зарлал нийтлэх
                </button>
              </form>
            </div>
          )}

          {/* ==================== TAB CONTENT: DROPOUT RISKS ==================== */}
          {activeTab === 'risk' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Сурагчдын явц ба Dropout Эрсдэлийн хяналт</h3>
                </div>
                <button
                  onClick={fetchData}
                  className="text-xs font-bold text-teal-500 hover:underline flex items-center gap-1"
                >
                  Шинэчлэх
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Оюутны нэр</th>
                      <th className="py-3 px-4">Оюутны код</th>
                      <th className="py-3 px-4">Регистрийн дугаар</th>
                      <th className="py-3 px-4 text-center">Эрсдэлийн оноо</th>
                      <th className="py-3 px-4 text-center">Эрсдэлийн төлөв</th>
                      <th className="py-3 px-4">Шалтгаан / Хяналтын хүчин зүйлс</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {dropoutRisks.map((risk) => (
                      <tr key={risk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-4 font-bold text-slate-850 dark:text-slate-200">{risk.fullName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{risk.code}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{risk.registerNumber || '—'}</td>
                        <td className="py-3 px-4 text-center font-extrabold text-slate-900 dark:text-white">{risk.riskScore}%</td>
                        <td className="py-3 px-4 text-center">
                          {risk.riskStatus === 'HIGH' ? (
                            <span className="bg-rose-500/10 text-rose-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ӨНДӨР</span>
                          ) : risk.riskStatus === 'MEDIUM' ? (
                            <span className="bg-amber-500/10 text-amber-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ДУНДАЖ</span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-2 py-0.5 rounded">БАГА</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate" title={risk.factors.join(', ')}>
                          {risk.factors.length > 0 ? risk.factors.join(', ') : 'Хэвийн, эрсдэлгүй'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
