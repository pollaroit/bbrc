"use client";

import { useOnlineStatus } from "@/lib/pwa/use-online-status";

export function PwaOfflineBanner() {
	const online = useOnlineStatus();

	if (online) {
		return null;
	}

	return (
		<div
			className="border-border border-b bg-muted px-6 py-2 text-center text-muted-foreground text-xs"
			role="status"
		>
			You&apos;re offline — showing saved content. Actions that need the network
			are unavailable.
		</div>
	);
}
