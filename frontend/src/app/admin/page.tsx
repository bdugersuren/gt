'use client';
import React, { useEffect, useState } from 'react';
import {
  Shield, Server, FileLock, UserCheck, CheckCircle2, AlertTriangle,
  Upload, Table, RefreshCw, Database
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('backup');

  // Data states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // File import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      // Fetch audit logs
      const logsRes = await fetch(`${apiUrl}/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (logsRes.ok) {
        setAuditLogs(await logsRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast('Мэдээлэл татахад алдаа гарлаа', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle CSV Import Submit
  const handleFileImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    setImportLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${apiUrl}/users/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        showToast('Хэрэглэгчдийг амжилттай импортлолоо!');
        setSelectedFile(null);
        loadData(); // Update audit logs list
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Импортлоход алдаа гарлаа', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Холболтын алдаа гарлаа', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold text-white transition-all transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/10' : 'bg-rose-500 border-rose-400 shadow-rose-500/10'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metrics Summary banner */}
      <div className="bg-[#0F172A] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-orange-500 uppercase tracking-widest">
            <Server className="w-4 h-4" />
            <span>СИСТЕМИЙН НӨӨЦЛӨЛТ БА АЮУЛГҮЙ БАЙДАЛ</span>
          </div>
          <h2 className="text-xl font-black">Хяналтын нэгдсэн самбар</h2>
          <p className="text-slate-400 text-xs max-w-md leading-relaxed">
            Эндээс нөөцлөлтийн ажиллагааны төлөвийг харах, audit log хянах болон CSV файлаар сурагчдыг багцаар импортлох боломжтой.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'backup', label: 'Нөөцлөлт (Backup & Restore)', icon: Database },
          { key: 'logs', label: 'Системийн логууд (Audit Logs)', icon: Table },
          { key: 'import', label: 'Хэрэглэгчид Импортлох (CSV)', icon: Upload },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading component */}
      {loading && activeTab !== 'import' ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Ачааллаж байна...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ==================== TAB CONTENT: BACKUPS ==================== */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl shadow-sm flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">Restore үйлдэл хамгаалагдсан</h3>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    Нөөцлөлт нь серверийн баталгаатай operational job-оор хийгдэнэ. Production өгөгдлийг веб интерфейсээс шууд сэргээх боломжгүй; staging restore drill болон ажиллагааны зөвшөөрөл шаардлагатай.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest">Одоогийн ажиллагааны бодлого</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-5">
                  <li>PostgreSQL custom-format dump болон MinIO object backup тусдаа хадгалагдана.</li>
                  <li>Backup бүр SHA-256 checksum болон manifest-тай байна.</li>
                  <li>Restore эхлээд staging орчинд шалгагдсаны дараа production ажиллагаанд зөвшөөрөгдөнө.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: AUDIT LOGS ==================== */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Системд хийгдсэн үйлдлийн логууд</h3>
                <button
                  onClick={loadData}
                  className="text-xs font-bold text-orange-500 hover:underline"
                >
                  Шинэчлэх
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="py-3 px-4">Хугацаа</th>
                      <th className="py-3 px-4">Хэрэглэгч</th>
                      <th className="py-3 px-4">Үйлдэл / Action</th>
                      <th className="py-3 px-4">Дэлгэрэнгүй / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-4 text-slate-450 font-medium">{new Date(log.timestamp).toLocaleString('mn-MN')}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-850 dark:text-slate-200">{log.user?.fullName}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{log.user?.code}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-500">{log.action}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: IMPORT USERS ==================== */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form area */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-orange-500" />
                    <span>Файл оруулах</span>
                  </h3>
                  
                  <form onSubmit={handleFileImport} className="space-y-4 text-xs">
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 p-6 rounded-2xl text-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                      <p className="font-bold text-slate-650 dark:text-slate-350">CSV Файл сонгох</p>
                      <p className="text-[9px] text-slate-400 mt-1">CSV багана: username, email, fullName, code, role, temporaryPassword</p>
                    </div>

                    {selectedFile && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="font-mono truncate pr-2">{selectedFile.name}</span>
                        <span className="text-[9px] text-slate-400 shrink-0">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedFile || importLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5"
                    >
                      {importLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Түр хүлээнэ үү...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Бүртгэл импортлох</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Import Result Details */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Импортын үр дүн</h3>
                  
                  {importResult ? (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                          <span className="text-[9px] font-bold text-slate-450 uppercase">НИЙТ МӨР</span>
                          <p className="text-lg font-black text-slate-800 dark:text-white mt-1">{importResult.totalRows}</p>
                        </div>
                        <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/15">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase">ИМПОРТЛОСОН</span>
                          <p className="text-lg font-black text-emerald-500 mt-1">{importResult.importedCount}</p>
                        </div>
                        <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/15">
                          <span className="text-[9px] font-bold text-rose-500 uppercase">АЛДААТАЙ</span>
                          <p className="text-lg font-black text-rose-500 mt-1">{importResult.failedCount}</p>
                        </div>
                      </div>

                      {importResult.errors?.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-bold text-rose-500 uppercase text-[10px]">Импортын явцад гарсан алдаанууд:</span>
                          <div className="border border-rose-500/15 rounded-xl p-3 bg-rose-500/5 max-h-48 overflow-y-auto space-y-1.5 divide-y divide-rose-500/10">
                            {importResult.errors.map((err: any, idx: number) => (
                              <div key={idx} className={`${idx > 0 ? 'pt-1.5' : ''} flex justify-between gap-4 text-[10px]`}>
                                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">Мөр {err.row}</span>
                                <span className="text-rose-500 leading-snug">{err.error}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Импорт хийсний дараа үр дүн энд харагдана.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
