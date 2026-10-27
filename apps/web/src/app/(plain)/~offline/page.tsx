import type { Metadata } from "next";

import { OfflineView } from "@/app/(plain)/~offline/offline-view";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Offline",
	description:
		"You are offline. Previously visited pages may still be available.",
	robots: { index: false, follow: false },
});

export default function OfflinePage() {
	return <OfflineView />;
}
