import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/holidays")({
  head: () => ({
    meta: [
      { title: "Holiday Calendar — PulseHR" },
      { name: "description", content: "Company holidays, weekends and branch-specific closures in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Holiday Calendar — PulseHR" },
      { property: "og:description", content: "Company holidays, weekends and branch-specific closures in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "2026 calendar",
    "body": "21 declared holidays with branch overrides and restricted-holiday pool."
  },
  {
    "heading": "Weekend policy",
    "body": "Alternate-Saturday policy for Production, fixed Sun-off elsewhere."
  },
  {
    "heading": "Payroll linkage",
    "body": "Holiday and weekend attendance automatically flagged for overtime."
  }
];

function Page() {
  return <ModulePage title="Holiday Calendar" subtitle="Company holidays, weekends and branch-specific closures" blocks={blocks} />;
}
