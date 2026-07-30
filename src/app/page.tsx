'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { downloadRecordsAsCSV } from '@/lib/csv';
import { Download, Scan, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const records = useLiveQuery(() => db.records.toArray());
  const pendingCount = records?.filter(r => r.status === 'pending').length || 0;

  const handleDownload = () => {
    if (!records || records.length === 0) return;
    downloadRecordsAsCSV(records);
    // Mark as exported
    db.transaction('rw', db.records, async () => {
      const ids = records.map(r => r.id!);
      await db.records.bulkUpdate(ids.map(id => ({ key: id, changes: { status: 'exported' } })));
    });
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all data from this device?')) {
      await db.records.clear();
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col items-center pb-24">
      <div className="w-full flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
          ID Scan
        </h1>
      </div>

      {/* Stats Card */}
      <div className="w-full glass-dark text-white rounded-2xl p-6 mb-8 shadow-xl flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300 mb-1">Total Scanned</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold">{records?.length || 0}</span>
            <span className="text-xs text-slate-400">records</span>
          </div>
        </div>
        <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center">
          <Users className="h-8 w-8 text-blue-400" />
        </div>
      </div>

      {/* Primary Actions */}
      <div className="w-full space-y-4">
        <Link 
          href="/scan"
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-white font-semibold shadow-lg shadow-blue-500/30"
        >
          <Scan className="h-5 w-5" />
          <span>Start Scanning</span>
        </Link>
        
        <button 
          onClick={handleDownload}
          disabled={!records?.length}
          className="w-full py-4 rounded-xl glass hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-5 w-5" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Scans</h2>
          {!!records?.length && (
            <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-600 flex items-center">
              <Trash2 className="h-3 w-3 mr-1"/> Clear All
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {!records?.length ? (
            <div className="text-center py-8 text-slate-400 text-sm glass rounded-xl">
              No ID cards scanned yet.
            </div>
          ) : (
            records.slice().reverse().slice(0, 5).map(record => (
              <div key={record.id} className="glass p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{record.name}</p>
                  <p className="text-xs text-slate-500">{record.rollNo} • {record.course}</p>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {record.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
