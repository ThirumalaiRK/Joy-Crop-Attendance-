"use client";

import { ModulePage } from "@/components/dashboard/module-page";

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

export default function Page() {
  return <ModulePage title="Access Control" subtitle="Door groups, time zones and credential rules on every terminal" blocks={blocks} />;
}
