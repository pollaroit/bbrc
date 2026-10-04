import type { Metadata } from "next";
import Link from "next/link";

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
		<div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
			<Logo className="size-16" label="BBRC" />
			<div className="flex flex-col gap-2">
				<h1 className="font-bold text-xl tracking-tight">
					You&apos;re offline
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Pages you opened while online may still load here. New actions and
					updates need a connection.
				</p>
			</div>
			<Link
				href="/"
				className="font-medium text-primary text-sm underline-offset-4 hover:underline"
			>
				Go to home
			</Link>
		</div>
	);
}
