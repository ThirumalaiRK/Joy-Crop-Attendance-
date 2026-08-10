'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import EmployeeSelfServicePortal from '../page';

export default function DynamicEmployeePortalPage() {
  const params = useParams();
  const rawId = params?.employeeId;
  const employeeId = Array.isArray(rawId) ? rawId[0] : rawId;

  return <EmployeeSelfServicePortal targetEmployeeId={employeeId} />;
}
