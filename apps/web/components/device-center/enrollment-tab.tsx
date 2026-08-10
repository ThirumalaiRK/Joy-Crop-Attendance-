import React from 'react';
import EnrollmentPage from '@/app/admin/employees/enroll/page';

export function EnrollmentTab() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* We reuse the previously built enrollment component here */}
      <EnrollmentPage />
    </div>
  );
}
