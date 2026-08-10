import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PulseHR" },
      { name: "description", content: "Tenant, security, connector and notification configuration in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Settings — PulseHR" },
      { property: "og:description", content: "Tenant, security, connector and notification configuration in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

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

function Page() {
  return <ModulePage title="Settings" subtitle="Tenant, security, connector and notification configuration" blocks={blocks} />;
}
