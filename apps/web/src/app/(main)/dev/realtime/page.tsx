import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RealtimeDevPanel } from "@/components/dev/realtime-dev-panel";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Realtime check",
	description: "Development only: checks the Ably connection.",
	robots: NO_INDEX_ROBOTS,
});

/** A one-click check that Ably is set up. Not available in production. */
export default function RealtimeDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}
	return <RealtimeDevPanel />;
}
