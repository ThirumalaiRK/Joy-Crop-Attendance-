"use client";

import { ModulePage } from "@/components/dashboard/module-page";

const blocks = [
  {
    "heading": "Admin actions",
    "body": "Who changed what, when, from which IP \u2014 including bulk operations."
  },
  {
    "heading": "Device actions",
    "body": "Restarts, clears, firmware checks and time syncs with operator identity."
  },
  {
    "heading": "Data access",
    "body": "Report exports and record views retained for compliance review."
  }
];

export default function Page() {
  return <ModulePage title="Audit Logs" subtitle="Immutable record of every administrative and device action" blocks={blocks} />;
}
