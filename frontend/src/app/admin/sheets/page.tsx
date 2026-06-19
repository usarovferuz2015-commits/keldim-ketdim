'use client';

import { useEffect, useState } from 'react';
import { sheetsApi } from '@/lib/api';
import {
  RefreshCw,
  FileSpreadsheet,
  Link,
  CheckCircle,
  XCircle,
  Clock,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SheetsStatus {
  lastSync?: string;
  isConnected?: boolean;
  spreadsheetId?: string;
  sheetName?: string;
  isActive?: boolean;
}

export default function AdminSheetsPage() {
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await sheetsApi.getStatus();
      const d = data.data || {};
      setStatus(d);
      setSpreadsheetId(d.spreadsheetId || '');
      setSheetName(d.sheetName || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await sheetsApi.syncNow();
      toast.success('Sinxronizatsiya bajarildi');
      fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sinxronizatsiyada xatolik';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!spreadsheetId.trim()) {
      toast.error('Spreadsheet ID kiritish shart');
      return;
    }
    setSaving(true);
    try {
      await sheetsApi.updateConfig({
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim() || undefined,
      });
      toast.success('Konfiguratsiya saqlandi');
      fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('uz-UZ');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <FileSpreadsheet className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchStatus}
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
        <h2 className="text-2xl font-bold text-gray-900">Google Sheets</h2>
        <p className="text-gray-500 mt-1">Google Sheets integratsiyasi sozlamalari</p>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-64 bg-gray-100 rounded mb-3" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-10 w-full bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sinxronizatsiya holati</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status?.isConnected ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {status?.isConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bog'lanish</p>
                  <p className="font-medium text-gray-900">
                    {status?.isConnected ? 'Ulangan' : 'Ulanmagan (Google Sheets API hali to\'liq ishga tushirilmagan)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Oxirgi sinxron</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {formatLastSync(status?.lastSync)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sheet nomi</p>
                  <p className="font-medium text-gray-900">
                    {status?.sheetName || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sinxronlanmoqda...' : 'Sinxronlash'}
              </button>
            </div>
          </div>

          {/* Config card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfiguratsiya</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Link className="w-4 h-4 text-gray-400" />
                    Spreadsheet ID
                  </span>
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  placeholder="1BxiMVs0XRA5nFMjKvBdBZjgmUUqptlbs74OgvE2upms"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Google Sheets URL dan ID ni kiriting: docs.google.com/spreadsheets/d/<b>SPREADSHEET_ID</b>/edit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sheet nomi</label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Sheet1"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
