import type { Metadata } from "next";

import { OfflineActions } from "@/app/~offline/offline-actions";
import { Logo } from "@/components/blocks/logo";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Offline",
	description:
		"You are offline. Previously visited pages may still be available.",
	robots: { index: false, follow: false },
});

export default function OfflinePage() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-12 text-center">
			<Logo className="size-16" label="BBRC" />
			<div className="flex max-w-[32ch] flex-col gap-2">
				<h1 className="font-bold text-xl tracking-tight">No connection</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Pages you already opened may still work. Anything new needs the
					network.
				</p>
			</div>
			<OfflineActions />
		</div>
	);
}
