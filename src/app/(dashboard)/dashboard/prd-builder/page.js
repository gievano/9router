import dynamic from "next/dynamic";

// SSR is off because the page reads localStorage on mount to restore a draft.
const PrdBuilderClient = dynamic(() => import("./PrdBuilderClient"), { ssr: false });

export default function PrdBuilderPage() {
  return <PrdBuilderClient />;
}
