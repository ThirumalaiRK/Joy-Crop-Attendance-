"use client";

import { ModulePage } from "@/components/dashboard/module-page";

const blocks = [
  {
    "heading": "Company & tenancy",
    "body": "Multi-tenant isolation, branding, locale, timezone and fiscal calendar."
  },
  {
    "heading": "Roles & permissions",
    "body": "Granular role permissions with company-level data isolation."
  },
  {
    "heading": "Local connector",
    "body": "Connector pairing keys, auto-update channel and offline cache policy."
  }
];

export default function Page() {
  return <ModulePage title="Settings" subtitle="Tenant, security, connector and notification configuration" blocks={blocks} />;
}
