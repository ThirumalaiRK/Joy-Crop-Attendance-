import React from 'react';
import { Save, Server, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function NetworkTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm max-w-3xl">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" />
          Network Configuration
        </h3>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <div>
              <Label className="text-slate-200 font-bold">DHCP Enabled</Label>
              <p className="text-xs text-slate-400 mt-1">Automatically obtain an IP address from the router.</p>
            </div>
            <Switch defaultChecked={false} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-wider">IP Address</Label>
              <Input defaultValue="192.168.1.56" className="bg-slate-950 border-slate-800 text-slate-200 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-wider">Subnet Mask</Label>
              <Input defaultValue="255.255.255.0" className="bg-slate-950 border-slate-800 text-slate-200 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-wider">Gateway</Label>
              <Input defaultValue="192.168.1.1" className="bg-slate-950 border-slate-800 text-slate-200 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-wider">TCP Port</Label>
              <Input defaultValue="4370" className="bg-slate-950 border-slate-800 text-slate-200 font-mono" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm max-w-3xl">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Security Options
        </h3>
        <div className="space-y-6">
          <div className="space-y-2 max-w-sm">
            <Label className="text-slate-400 text-xs uppercase tracking-wider">Comm Password</Label>
            <Input type="password" placeholder="Leave blank for none" className="bg-slate-950 border-slate-800 text-slate-200" />
            <p className="text-xs text-slate-500">Required if the device was locked with a PC communication password.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl flex justify-end gap-4">
        <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">Discard Changes</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <Save className="w-4 h-4 mr-2" /> Save to Device
        </Button>
      </div>
    </div>
  );
}
