import Dexie, { type Table } from 'dexie';

export interface OfflineCourse {
  id: string;
  title: string;
  code: string;
  description?: string;
  coverImage?: string;
}

export interface OfflineLesson {
  id: string;
  title: string;
  order: number;
  contentType: string;
  contentBody?: string;
  videoUrl?: string;
  pdfUrl?: string;
  moduleId: string;
}

export interface SyncQueueItem {
  id?: number; // Auto-incrementing primary key
  action: 'lesson-complete' | 'internship-log-create';
  payload: any;
  timestamp: number;
}

export class OfflineLMSDatabase extends Dexie {
  courses!: Table<OfflineCourse>;
  lessons!: Table<OfflineLesson>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('OfflineLMSDatabase');
    this.version(1).stores({
      courses: 'id, code',
      lessons: 'id, moduleId',
      syncQueue: '++id, action',
    });
  }
}

// Export a single database instance
export const db = new OfflineLMSDatabase();
