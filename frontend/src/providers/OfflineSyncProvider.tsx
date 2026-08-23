'use client';
import React, { useEffect } from 'react';
import { useLmsStore } from '../store/useLmsStore';
import { db } from '../lib/db';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface OfflineSyncProviderProps {
  children: React.ReactNode;
}

export default function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const { isOnline, syncing, setOnline, setSyncing } = useLmsStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and trigger sync if online
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    const queueItems = await db.syncQueue.toArray();
    if (queueItems.length === 0) return;

    setSyncing(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    for (const item of queueItems) {
      try {
        let endpoint = '';
        let method = 'POST';

        if (item.action === 'lesson-complete') {
          endpoint = `${apiUrl}/lessons/${item.payload.lessonId}/complete`;
        } else if (item.action === 'internship-log-create') {
          endpoint = `${apiUrl}/internship-logs`;
        }

        if (endpoint) {
          const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(item.payload),
          });

          if (response.ok) {
            // Remove from queue upon successful sync
            await db.syncQueue.delete(item.id!);
          } else {
            console.error(`[OfflineSync] Sync failed for item ${item.id}:`, await response.text());
          }
        }
      } catch (err) {
        console.error(`[OfflineSync] Network error syncing item ${item.id}:`, err);
        // Break loop if network is still unreachable
        break;
      }
    }

    setSyncing(false);
  };

  return (
    <>
      {children}

      {/* Premium Connection Status Notification Toast */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none transition-all duration-300">
        {!isOnline && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-500/20 border border-rose-400/30 animate-bounce">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold tracking-wide">
              Сүлжээгүй горим (Орон нутгийн горим идэвхтэй)
            </span>
          </div>
        )}

        {isOnline && syncing && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-500 text-white rounded-2xl shadow-xl shadow-teal-500/20 border border-teal-400/30">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span className="text-xs font-semibold tracking-wide">
              Өгөгдлийг синк хийж байна...
            </span>
          </div>
        )}
      </div>
    </>
  );
}
