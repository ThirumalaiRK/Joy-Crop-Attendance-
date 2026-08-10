'use client';

import { useState, useEffect } from 'react';

export default function BiometricsDashboard() {
  const [devices, setDevices] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  // In a real app, this would query Supabase.
  // For demonstration, we'll hit the local connector if running on localhost.
  useEffect(() => {
    const fetchConnectorData = async () => {
      try {
        const devRes = await fetch('http://localhost:4000/devices');
        if (devRes.ok) setDevices(await devRes.json());
        
        const attRes = await fetch('http://localhost:4000/attendance');
        if (attRes.ok) setAttendance(await attRes.json());
      } catch (err) {
        console.error('Connector not running on localhost:4000');
      }
    };
    
    fetchConnectorData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Enterprise Biometric Device Integration Engine</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Devices Panel */}
        <div className="border p-6 rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 className="text-2xl font-semibold mb-4">Devices</h2>
          {devices.length === 0 ? (
            <p className="text-gray-500">No devices connected.</p>
          ) : (
            <ul className="space-y-4">
              {devices.map((device, i) => (
                <li key={i} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-bold">{device.deviceName || device.ip}</p>
                    <p className="text-sm text-gray-500">IP: {device.ip}:{device.port}</p>
                    <p className="text-xs text-gray-400">SN: {device.sn}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs text-white ${device.online ? 'bg-green-500' : 'bg-red-500'}`}>
                    {device.online ? 'Online' : 'Offline'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Attendance Panel */}
        <div className="border p-6 rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 className="text-2xl font-semibold mb-4">Recent Attendance Logs</h2>
          {attendance.length === 0 ? (
            <p className="text-gray-500">No logs synchronized yet.</p>
          ) : (
            <ul className="space-y-2">
              {attendance.map((log, i) => (
                <li key={i} className="text-sm border-b pb-1">
                  User <span className="font-bold">{log.deviceUserId}</span> at {new Date(log.recordTime).toLocaleString()} (Device: {log.ip})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
