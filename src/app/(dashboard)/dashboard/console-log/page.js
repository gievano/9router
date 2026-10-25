import LogsClient from "../logs/LogsClient";

export const dynamic = "force-dynamic";

export default function ConsoleLogPage() {
  return <LogsClient initialTab="console" />;
}
