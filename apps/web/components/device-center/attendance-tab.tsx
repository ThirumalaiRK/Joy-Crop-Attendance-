import React from 'react';
import { DownloadCloud, Trash2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AttendanceTab() {
  const logs = [
    { id: 1003, emp: 'John Doe', time: '2026-08-06 09:02:14', mode: 'Fingerprint', status: 'Success' },
    { id: 1002, emp: 'Mike Ross', time: '2026-08-06 08:58:33', mode: 'Face', status: 'Success' },
    { id: 1001, emp: 'Unknown', time: '2026-08-06 08:45:11', mode: 'Fingerprint', status: 'Failed' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Attendance Synchronization</h3>
          <p className="text-xs text-slate-400">Download missing attendance logs from this device to the Supabase master record.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500">
            <DownloadCloud className="w-4 h-4 mr-2" /> Sync Now
          </Button>
          <Button variant="outline" size="sm" className="bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20">
            <Trash2 className="w-4 h-4 mr-2" /> Clear Logs
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Recent Device Logs
          </h4>
          <span className="text-xs text-slate-500">Showing last 50 records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Log ID</th>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Verify Mode</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">{log.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-200">{log.emp}</td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{log.time}</td>
                  <td className="px-6 py-4 text-slate-400">{log.mode}</td>
                  <td className="px-6 py-4">
                    {log.status === 'Success' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <CheckCircle className="w-3 h-3" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
