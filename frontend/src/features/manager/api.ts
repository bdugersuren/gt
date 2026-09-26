export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'STUDENT' | 'ENTERPRISE_MENTOR';

export interface Teacher {
  id: string;
  fullName: string;
  email?: string;
  code?: string;
  roles?: Role[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  _count?: { users: number; courses: number; classes: number };
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description?: string;
  isCBT: boolean;
  department: Pick<Department, 'id' | 'name' | 'code'>;
  teachers: Array<Pick<Teacher, 'id' | 'fullName' | 'email' | 'code'>>;
  _count?: { enrollments: number; modules: number };
}

export interface Student {
  id: string;
  fullName: string;
  code?: string;
}

export interface DropoutRisk extends Student {
  riskStatus: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore?: number;
}

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';
export interface CourseEnrollment {
  id: string; studentId: string; source?: 'CURRICULUM' | 'STANDALONE' | 'CLASS_BATCH'; startDate: string; endDate?: string | null; status: EnrollmentStatus;
  statusReason?: string; cbtStatus: string;
  student: Student & { email?: string; classGroup?: { id: string; name: string; code: string } };
  progress: { completedLessons: number; totalLessons: number; percent: number };
}
export interface EnrollmentList { items: CourseEnrollment[]; counts: Record<EnrollmentStatus, number>; classGroups: Array<{ id: string; name: string; code: string }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface EnrollmentCandidate extends Student { email?: string; classGroup?: { id: string; name: string; code: string } }
export interface CandidateList { items: EnrollmentCandidate[]; classGroups: Array<{ id: string; name: string; code: string; count: number }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface ImportPreviewRow { row: number; username: string; email: string; fullName: string; code: string; departmentCode?: string; classGroupCode?: string; registerNumber?: string; errors: string[]; valid: boolean }
export interface ImportPreview { fileChecksum: string; totalRows: number; validCount: number; invalidCount: number; rows: ImportPreviewRow[] }

export class ManagerApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details: string[] = []) {
    super(message);
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getMessage(payload: unknown, fallback: string): { message: string; details: string[] } {
  if (!payload || typeof payload !== 'object') return { message: fallback, details: [] };
  const value = (payload as { message?: unknown }).message;
  if (Array.isArray(value)) {
    const details = value.filter((item): item is string => typeof item === 'string');
    return { message: details[0] || fallback, details };
  }
  return { message: typeof value === 'string' ? value : fallback, details: [] };
}

export async function managerApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) throw new ManagerApiError('Нэвтрэх хугацаа дууссан байна', 401);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        'x-active-role': 'MANAGER',
        ...init.headers,
      },
    });
  } catch {
    throw new ManagerApiError('Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.', 0);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 403
      ? 'Энэ үйлдлийг хийх эрхгүй байна'
      : response.status >= 500 ? 'Серверийн алдаа гарлаа' : 'Хүсэлт амжилтгүй боллоо';
    const parsed = getMessage(payload, fallback);
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeRole');
      window.location.assign('/login');
    }
    throw new ManagerApiError(parsed.message, response.status, parsed.details);
  }
  return payload as T;
}

export async function managerDownload(path: string, init: RequestInit = {}): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) throw new ManagerApiError('Нэвтрэх хугацаа дууссан байна', 401);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'x-active-role': 'MANAGER', ...init.headers } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const parsed = getMessage(payload, 'Файл татаж чадсангүй');
    throw new ManagerApiError(parsed.message, response.status, parsed.details);
  }
  return response.blob();
}

export const managerQueries = {
  courses: () => managerApi<Course[]>('/courses'),
  course: (id: string) => managerApi<Course>(`/courses/${id}`),
  departments: () => managerApi<Department[]>('/departments'),
  teachers: () => managerApi<Teacher[]>('/users/role/TEACHER'),
  students: () => managerApi<Student[]>('/users/role/STUDENT'),
  risks: () => managerApi<DropoutRisk[]>('/users/students/dropout-risk'),
};

export function errorText(error: unknown): string {
  return error instanceof ManagerApiError ? error.message : 'Тодорхойгүй алдаа гарлаа';
}
