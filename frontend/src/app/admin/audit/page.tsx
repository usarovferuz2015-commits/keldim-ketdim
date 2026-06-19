'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  X,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  user?: { firstName: string; lastName?: string };
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  details?: string;
}

const PAGE_SIZE = 15;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const { data } = await adminApi.getAuditLogs(params);
      setLogs(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Tashkent',
      };
      return d.toLocaleDateString('uz-UZ', options);
    } catch {
      return '—';
    }
  };

  const getActionBadge = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('yarat')) {
      return 'bg-green-100 text-green-700';
    }
    if (lower.includes('update') || lower.includes('tahrir') || lower.includes('yangila')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (lower.includes('delete') || lower.includes('ochir')) {
      return 'bg-red-100 text-red-700';
    }
    if (lower.includes('login') || lower.includes('kirish') || lower.includes('auth')) {
      return 'bg-purple-100 text-purple-700';
    }
    if (lower.includes('sync') || lower.includes('sinxron')) {
      return 'bg-indigo-100 text-indigo-700';
    }
    if (lower.includes('export')) {
      return 'bg-orange-100 text-orange-700';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <ShieldCheck className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <p className="text-gray-500 mt-1">Tizimdagi barcha amallar tarixi</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Dan:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Gacha:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Foydalanuvchi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Obyekt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tafs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Audit log ma'lumotlari topilmadi
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName || ''}`
                        : log.userId || 'Tizim'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.entity}
                      {log.entityId && (
                        <span className="text-gray-400 text-xs ml-1 font-mono">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Tafsilotlar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {total} ta natijadan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} ko'rsatilmoqda
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="contents">
                    {idx > 0 && p - (arr[idx - 1] ?? 0) > 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tafsilotlar</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Vaqt:</span>
                <span className="text-gray-900 font-mono">{formatDate(selectedLog.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Foydalanuvchi:</span>
                <span className="text-gray-900">
                  {selectedLog.user
                    ? `${selectedLog.user.firstName} ${selectedLog.user.lastName || ''}`
                    : selectedLog.userId || 'Tizim'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amal:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadge(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Obyekt:</span>
                <span className="text-gray-900">
                  {selectedLog.entity}
                  {selectedLog.entityId && ` #${selectedLog.entityId.slice(0, 8)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IP manzil:</span>
                <span className="text-gray-900 font-mono">{selectedLog.ipAddress || 'Noma\'lum'}</span>
              </div>
              {selectedLog.details && (
                <div>
                  <span className="text-gray-500 block mb-1">Tafsilotlar:</span>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                    {typeof selectedLog.details === 'string'
                      ? selectedLog.details
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
