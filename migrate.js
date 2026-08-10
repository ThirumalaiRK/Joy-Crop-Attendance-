const fs = require('fs');
const path = require('path');

const srcDir = 'F:/TEST LIVE ATTENDANCE/office attende ui/src/routes';
const outDir = 'F:/TEST LIVE ATTENDANCE/apps/web/app';

const pages = [
  { file: 'departments.tsx', dest: 'hr/departments/page.tsx' },
  { file: 'shifts.tsx', dest: 'hr/shifts/page.tsx' },
  { file: 'holidays.tsx', dest: 'hr/holidays/page.tsx' },
  { file: 'leave.tsx', dest: 'hr/leave/page.tsx' },
  { file: 'payroll.tsx', dest: 'hr/payroll/page.tsx' },
  { file: 'reports.tsx', dest: 'hr/reports/page.tsx' },
  { file: 'visitors.tsx', dest: 'admin/visitors/page.tsx' },
  { file: 'access-control.tsx', dest: 'admin/access-control/page.tsx' },
  { file: 'audit.tsx', dest: 'admin/audit/page.tsx' },
  { file: 'settings.tsx', dest: 'admin/settings/page.tsx' },
];

pages.forEach(p => {
  const srcPath = path.join(srcDir, p.file);
  const dstPath = path.join(outDir, p.dest);
  if (!fs.existsSync(srcPath)) { console.log('Missing: ' + p.file); return; }
  
  const content = fs.readFileSync(srcPath, 'utf8');
  
  // Extract blocks
  const blocksMatch = content.match(/const blocks = (\[[\s\S]*?\]);/);
  const blocks = blocksMatch ? blocksMatch[1] : '[]';
  
  // Extract title and subtitle
  const pageMatch = content.match(/<ModulePage title="(.*?)" subtitle="(.*?)"/);
  let title = 'Module';
  let subtitle = '';
  if (pageMatch) {
    title = pageMatch[1];
    subtitle = pageMatch[2];
  }
  
  const newContent = `"use client";

import { ModulePage } from "@/components/dashboard/module-page";

const blocks = ${blocks};

export default function Page() {
  return <ModulePage title="${title}" subtitle="${subtitle}" blocks={blocks} />;
}
`;

  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.writeFileSync(dstPath, newContent);
  console.log('Created: ' + p.dest);
});
