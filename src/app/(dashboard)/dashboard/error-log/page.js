import LogsClient from "../logs/LogsClient";

export const dynamic = "force-dynamic";

export default function ErrorLogPage() {
  return <LogsClient initialTab="errors" />;
}
