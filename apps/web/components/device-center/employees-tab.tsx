import React from 'react';
import { Users, UploadCloud, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmployeesTab() {
  const employees = [
    { id: 'EMP001', code: 'PH-1042', name: 'John Doe', inHrms: true, onDevice: true },
    { id: 'EMP002', code: 'PH-1043', name: 'Jane Smith', inHrms: true, onDevice: false },
    { id: 'EMP003', code: 'PH-1044', name: 'Mike Ross', inHrms: true, onDevice: true },
    { id: 'EMP004', code: 'UNKNOWN', name: 'Unknown (ID: 99)', inHrms: false, onDevice: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Employee Synchronization</h3>
          <p className="text-xs text-slate-400">Manage users on this specific terminal. Push HRMS users to the device or clear unused records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-slate-950 border-slate-800 hover:bg-slate-800">
            <UploadCloud className="w-4 h-4 mr-2" /> Push Pending (1)
          </Button>
          <Button variant="outline" size="sm" className="bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20">
            <Trash2 className="w-4 h-4 mr-2" /> Clear All Users
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Employee Name</th>
                <th className="px-6 py-4 font-medium">Emp Code</th>
                <th className="px-6 py-4 font-medium text-center">In HRMS</th>
                <th className="px-6 py-4 font-medium text-center">On Device</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">{emp.name}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{emp.code}</td>
                  <td className="px-6 py-4 text-center">
                    {emp.inHrms ? (
                      <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                    ) : (
                      <span className="inline-flex w-2 h-2 rounded-full bg-slate-700"></span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {emp.onDevice ? (
                      <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                    ) : (
                      <span className="inline-flex w-2 h-2 rounded-full bg-slate-700"></span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!emp.onDevice && emp.inHrms && (
                      <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                        Push to Device
                      </Button>
                    )}
                    {emp.onDevice && !emp.inHrms && (
                      <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                        Remove from Device
                      </Button>
                    )}
                    {emp.onDevice && emp.inHrms && (
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300 hover:bg-slate-800">
                        Remove
                      </Button>
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
