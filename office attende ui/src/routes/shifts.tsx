import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/shifts")({
  head: () => ({
    meta: [
      { title: "Shifts & Schedules — PulseHR" },
      { name: "description", content: "General, night, rotational, split and flexible shift patterns with grace and overtime rules in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Shifts & Schedules — PulseHR" },
      { property: "og:description", content: "General, night, rotational, split and flexible shift patterns with grace and overtime rules in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Shift library",
    "body": "General 09:00\u201318:00, Night 22:00\u201306:00, Split 07:00\u201320:00 and Flexible with 15-minute grace."
  },
  {
    "heading": "Late & early-out rules",
    "body": "Grace time, half-day thresholds and repeated-late escalation per department."
  },
  {
    "heading": "Roster planner",
    "body": "Drag-and-drop weekly roster with bulk assignment and conflict detection."
  }
];

function Page() {
  return <ModulePage title="Shifts & Schedules" subtitle="General, night, rotational, split and flexible shift patterns with grace and overtime rules" blocks={blocks} />;
}
