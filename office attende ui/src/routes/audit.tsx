import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — PulseHR" },
      { name: "description", content: "Immutable record of every administrative and device action in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Audit Logs — PulseHR" },
      { property: "og:description", content: "Immutable record of every administrative and device action in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

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

function Page() {
  return <ModulePage title="Audit Logs" subtitle="Immutable record of every administrative and device action" blocks={blocks} />;
}
