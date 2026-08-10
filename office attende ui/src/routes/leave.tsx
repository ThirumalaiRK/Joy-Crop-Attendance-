import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/leave")({
  head: () => ({
    meta: [
      { title: "Leave Management — PulseHR" },
      { name: "description", content: "Balances, requests and multi-level approval workflow in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Leave Management — PulseHR" },
      { property: "og:description", content: "Balances, requests and multi-level approval workflow in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Leave types",
    "body": "Casual, sick, earned, comp-off, maternity and loss-of-pay with accrual rules."
  },
  {
    "heading": "Approval workflow",
    "body": "Manager then HR approval, with auto-approval for comp-off under 1 day."
  },
  {
    "heading": "Balances & history",
    "body": "Live balance ledger per employee with carry-forward and encashment view."
  }
];

function Page() {
  return <ModulePage title="Leave Management" subtitle="Balances, requests and multi-level approval workflow" blocks={blocks} />;
}
