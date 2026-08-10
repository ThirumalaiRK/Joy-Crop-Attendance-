import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll Preparation — PulseHR" },
      { name: "description", content: "Attendance-derived inputs ready for your payroll engine in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Payroll Preparation — PulseHR" },
      { property: "og:description", content: "Attendance-derived inputs ready for your payroll engine in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Working-day computation",
    "body": "Present days, half-days, leave, holidays and weekends resolved per employee."
  },
  {
    "heading": "Deductions & overtime",
    "body": "Late deductions by rule, LOP days and approved overtime hours at configured multipliers."
  },
  {
    "heading": "Export",
    "body": "Period-locked payroll export to Excel, CSV or your ERP schema."
  }
];

function Page() {
  return <ModulePage title="Payroll Preparation" subtitle="Attendance-derived inputs ready for your payroll engine" blocks={blocks} />;
}
