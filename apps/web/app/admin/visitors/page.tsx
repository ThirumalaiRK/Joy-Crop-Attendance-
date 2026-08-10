"use client";

import { ModulePage } from "@/components/dashboard/module-page";

const blocks = [
  {
    "heading": "Check-in",
    "body": "Photo capture, ID proof, host selection and purpose of visit."
  },
  {
    "heading": "Badges & access",
    "body": "Temporary access credentials with automatic expiry at check-out."
  },
  {
    "heading": "Logs",
    "body": "Searchable visitor history with per-branch reporting."
  }
];

export default function Page() {
  return <ModulePage title="Visitor Management" subtitle="Front-desk check-in with badge printing and host notification" blocks={blocks} />;
}
