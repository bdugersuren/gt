'use client';
import React, { useCallback, useRef, useState } from 'react';
import {
  Upload, X, Check, Copy, Link2, Image, FileText,
  Music, Video, File, Loader2, ExternalLink, Trash2,
  ClipboardCopy, AlertCircle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UploadedFile {
  id:           string;
  key:          string;
  publicUrl:    string;
  type:         string;
  originalName: string;
  mimeType:     string;
  sizeBytes:    number;
  uploadedAt:   string;
}

interface MediaUploaderProps {
  /** Байршуулсан файлыг тухайн лекцтэй холбох (заавал биш) */
  lessonId?:  string;
  /** Байршуулсан файлыг тухайн курстай холбох (заавал биш) */
  courseId?:  string;
  /** Файл байршуулсны дараах callback */
  onUpload?:  (file: UploadedFile) => void;
  /** Зөвшөөрөх MIME type-ийн жагсаалт (хоосон бол бүгдийг зөвшөөрнө) */
  accept?:    string;
  /** Нэг эсвэл олон файл */
  multiple?:  boolean;
  /** Товч дуудалтад харуулах гарчиг */
  label?:     string;
  /** Compact горим: жижиг хэлбэр */
  compact?:   boolean;
}

// ─── Туслах функцууд ──────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'IMAGE':    return <Image    className="w-4 h-4 text-blue-500"   />;
    case 'PDF':      return <FileText className="w-4 h-4 text-rose-500"   />;
    case 'AUDIO':    return <Music    className="w-4 h-4 text-violet-500" />;
    case 'VIDEO_RAW':
    case 'VIDEO_HLS':return <Video    className="w-4 h-4 text-amber-500"  />;
    case 'MARKDOWN': return <File     className="w-4 h-4 text-emerald-500"/>;
    default:         return <File     className="w-4 h-4 text-slate-400"  />;
  }
}

function getMarkdownSnippet(file: UploadedFile): string {
  switch (file.type) {
    case 'IMAGE':
      return `![${file.originalName}](${file.publicUrl})`;
    case 'PDF':
      return `[📄 ${file.originalName}](${file.publicUrl})`;
    case 'AUDIO':
      return `[🎵 ${file.originalName}](${file.publicUrl})`;
    case 'VIDEO_HLS':
    case 'VIDEO_RAW':
      return `[🎬 ${file.originalName}](${file.publicUrl})`;
    default:
      return `[${file.originalName}](${file.publicUrl})`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function MediaUploader({
  lessonId,
  courseId,
  onUpload,
  accept = 'image/*,application/pdf,audio/*,text/markdown,.md,video/mp4,video/webm,video/quicktime',
  multiple = true,
  label = 'Файл байршуулах',
  compact = false,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging]         = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles]   = useState<UploadedFile[]>([]);
  const [error, setError]                   = useState('');
  const [copiedKey, setCopiedKey]           = useState<string | null>(null);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || '/api')
    : '';

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFiles(files);
  }, [lessonId, courseId]);

  // ─── Upload ───────────────────────────────────────────────────────────────
  const uploadFiles = async (files: File[]) => {
    setError('');
    setUploading(true);
    setUploadProgress(0);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Симуляцийн progress (real XHR progress бол XMLHttpRequest ашиглана)
    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 85));
    }, 200);

    try {
      let result: UploadedFile[] = [];

      if (files.length === 1) {
        // Нэг файл
        const formData = new FormData();
        formData.append('file', files[0]);
        if (lessonId) formData.append('lessonId', lessonId);
        if (courseId) formData.append('courseId', courseId);

        const res = await fetch(`${apiUrl}/media/upload`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Байршуулахад алдаа гарлаа' }));
          throw new Error(err.message || 'Байршуулахад алдаа гарлаа');
        }
        result = [await res.json()];
      } else {
        // Олон файл
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        if (lessonId) formData.append('lessonId', lessonId);
        if (courseId) formData.append('courseId', courseId);

        const res = await fetch(`${apiUrl}/media/upload/multi`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Байршуулахад алдаа гарлаа' }));
          throw new Error(err.message || 'Байршуулахад алдаа гарлаа');
        }
        result = await res.json();
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);

      setUploadedFiles(prev => [...result, ...prev]);
      result.forEach(f => onUpload?.(f));

    } catch (err: any) {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
      setError(err.message || 'Байршуулахад алдаа гарлаа');
    }
  };

  // ─── Clipboard copy ───────────────────────────────────────────────────────
  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl transition-all cursor-pointer
          ${compact ? 'p-4' : 'p-8'}
          ${isDragging
            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
          }
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            if (files.length) uploadFiles(files);
            e.target.value = '';
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Байршуулж байна...</p>
            {/* Progress bar */}
            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">{uploadProgress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center`}>
              <Upload className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-orange-500`} />
            </div>
            <div>
              <p className={`font-bold text-slate-700 dark:text-slate-200 ${compact ? 'text-xs' : 'text-sm'}`}>
                {isDragging ? 'Файлаа энд чирж тавина уу' : label}
              </p>
              {!compact && (
                <>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Зураг (≤10MB), PDF (≤20MB), Аудио (≤50MB), Видео (≤500MB), Markdown (≤2MB)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Файлаа чирж тавих эсвэл дарж сонгоно уу
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Байршуулсан файлууд ({uploadedFiles.length})
          </p>
          {uploadedFiles.map(file => (
            <div
              key={file.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5"
            >
              {/* File info */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{file.originalName}</p>
                  <p className="text-[10px] text-slate-400">{formatBytes(file.sizeBytes)} · {file.mimeType}</p>
                </div>
                <a
                  href={file.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-orange-500 p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                  title="Шинэ цонхонд нээх"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* URL + copy buttons */}
              <div className="space-y-1.5">
                {/* Raw URL */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate flex-1">
                    {file.publicUrl}
                  </p>
                  <button
                    onClick={() => copyToClipboard(file.publicUrl, `url-${file.id}`)}
                    className={`shrink-0 p-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      copiedKey === `url-${file.id}`
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-orange-500 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="URL хуулах"
                  >
                    {copiedKey === `url-${file.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Markdown snippet */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-black text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded shrink-0">MD</span>
                  <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate flex-1">
                    {getMarkdownSnippet(file)}
                  </p>
                  <button
                    onClick={() => copyToClipboard(getMarkdownSnippet(file), `md-${file.id}`)}
                    className={`shrink-0 p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      copiedKey === `md-${file.id}`
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-orange-500 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="Markdown код хуулах"
                  >
                    {copiedKey === `md-${file.id}` ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Image preview */}
              {file.type === 'IMAGE' && (
                <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-32">
                  <img
                    src={file.publicUrl}
                    alt={file.originalName}
                    className="w-full h-32 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Remove from list */}
              <button
                onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                className="w-full text-[10px] text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-colors"
              >
                <X className="w-3 h-3" />
                Жагсаалтаас хасах
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaUploader;
