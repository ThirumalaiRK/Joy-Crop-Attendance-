import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Exports — PulseHR" },
      { name: "description", content: "Operational and compliance reporting with Excel, CSV and PDF output in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Reports & Exports — PulseHR" },
      { property: "og:description", content: "Operational and compliance reporting with Excel, CSV and PDF output in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Attendance reports",
    "body": "Daily, monthly, late, early-out, overtime and missed-punch reports."
  },
  {
    "heading": "Summaries",
    "body": "Department, branch and employee summaries with period comparison."
  },
  {
    "heading": "Audit & payroll",
    "body": "Audit trail report and payroll input report for finance sign-off."
  }
];

function Page() {
  return <ModulePage title="Reports & Exports" subtitle="Operational and compliance reporting with Excel, CSV and PDF output" blocks={blocks} />;
}
