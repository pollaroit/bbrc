import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FreeReadingMode } from "@/components/reading-mode/free-reading-mode";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

/** Private to the member: never cached or indexed. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Reading Mode",
	description: "A quiet timer with sounds, with or without a book.",
	robots: NO_INDEX_ROBOTS,
});

export default async function FreeReadingModePage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect(authPageHref("/sign-in", "/reading") as Route);
	}
	return <FreeReadingMode />;
}
