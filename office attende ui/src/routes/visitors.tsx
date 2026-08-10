import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/visitors")({
  head: () => ({
    meta: [
      { title: "Visitor Management — PulseHR" },
      { name: "description", content: "Front-desk check-in with badge printing and host notification in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Visitor Management — PulseHR" },
      { property: "og:description", content: "Front-desk check-in with badge printing and host notification in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

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

function Page() {
  return <ModulePage title="Visitor Management" subtitle="Front-desk check-in with badge printing and host notification" blocks={blocks} />;
}
