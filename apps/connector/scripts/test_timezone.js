const d = new Date('2026-08-10T06:48:54.000Z');
console.log('Without timezone (Vercel server UTC):', d.toLocaleTimeString('en-US'));
console.log('With Asia/Kolkata timezone:', d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
