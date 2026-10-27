import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BlockedOpenLibraryWorksList } from "@/components/blocks/blocked-open-library-works-list";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Blocked recommendation works",
	description:
		"Open Library works excluded from admin book recommendations until unblocked.",
	path: "/books/blocked",
	robots: NO_INDEX_ROBOTS,
});

export default async function BlockedOpenLibraryWorksPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/books" as Route);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="space-y-1.5 border-border border-b pb-6">
				<h1 className="font-bold text-2xl tracking-tight">
					Blocked recommendation works
				</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					These Open Library works are hidden from Recommend picks (including
					duplicate editions). Unblock here to allow them again.
				</p>
			</div>
			<BlockedOpenLibraryWorksList />
		</div>
	);
}
