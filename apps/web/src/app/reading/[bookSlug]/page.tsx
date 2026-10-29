import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReadingMode } from "@/components/reading-mode/reading-mode";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

/** Private to the reader and different for everyone: never cached or indexed. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Reading Mode",
	description: "A quiet timer and page counter for your reading.",
	robots: NO_INDEX_ROBOTS,
});

export default async function ReadingModePage({
	params,
}: PageProps<"/reading/[bookSlug]">) {
	const { bookSlug } = await params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect(authPageHref("/sign-in", `/reading/${bookSlug}`) as Route);
	}
	return <ReadingMode bookSlug={bookSlug} />;
}
