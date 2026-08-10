import React from 'react';
import { Clock, RefreshCcw, Database, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MaintenanceTab() {
  const actions = [
    {
      title: 'Sync Device Time',
      description: 'Send current Windows server time to the terminal via SET_TIME command.',
      icon: Clock,
      buttonText: 'Sync Time',
      buttonStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    {
      title: 'Restart Terminal',
      description: 'Reboots the biometric device remotely.',
      icon: RefreshCcw,
      buttonText: 'Restart',
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    },
    {
      title: 'Backup Device Data',
      description: 'Downloads a raw binary backup of users and templates.',
      icon: Database,
      buttonText: 'Backup',
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    },
    {
      title: 'Clear Administrator',
      description: 'Removes all admin privileges from users on the terminal (CMD_CLEAR_ADMIN).',
      icon: ShieldAlert,
      buttonText: 'Clear Admin',
      buttonStyle: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30',
    },
    {
      title: 'Factory Reset',
      description: 'Wipes everything on the device and restores factory settings.',
      icon: Trash2,
      buttonText: 'Factory Reset',
      buttonStyle: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                  <Icon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{action.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{action.description}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className={action.buttonStyle}>
                  {action.buttonText}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
