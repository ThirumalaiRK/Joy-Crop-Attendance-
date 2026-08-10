import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments & Branches — PulseHR" },
      { name: "description", content: "Org structure across 3 branches and 6 departments in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Departments & Branches — PulseHR" },
      { property: "og:description", content: "Org structure across 3 branches and 6 departments in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Department tree",
    "body": "Engineering, Operations, Finance, People, Sales and Production with head-count and cost-centre mapping."
  },
  {
    "heading": "Branch registry",
    "body": "Head Office, Manufacturing Plant and Central Warehouse \u2014 each with its own terminals and shift rules."
  },
  {
    "heading": "Reporting lines",
    "body": "Manager hierarchy used for leave approval routing and attendance escalation."
  }
];

function Page() {
  return <ModulePage title="Departments & Branches" subtitle="Org structure across 3 branches and 6 departments" blocks={blocks} />;
}
