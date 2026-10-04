import SecurityLogClient from "./SecurityLogClient";

// Force dynamic so the page always reflects the live log rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default function SecurityLogPage() {
  return <SecurityLogClient />;
}
