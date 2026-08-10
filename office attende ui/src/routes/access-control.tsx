import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/access-control")({
  head: () => ({
    meta: [
      { title: "Access Control — PulseHR" },
      { name: "description", content: "Door groups, time zones and credential rules on every terminal in PulseHR, the enterprise workforce management platform." },
      { property: "og:title", content: "Access Control — PulseHR" },
      { property: "og:description", content: "Door groups, time zones and credential rules on every terminal in PulseHR, the enterprise workforce management platform." },
    ],
  }),
  component: Page,
});

const blocks = [
  {
    "heading": "Time zones",
    "body": "Up to 50 time zones combined into access groups per terminal."
  },
  {
    "heading": "Door rules",
    "body": "Lock delay, anti-passback, duress fingerprint and door-sensor alarms."
  },
  {
    "heading": "Credential policy",
    "body": "Fingerprint, face, RFID and password combinations per role."
  }
];

function Page() {
  return <ModulePage title="Access Control" subtitle="Door groups, time zones and credential rules on every terminal" blocks={blocks} />;
}
