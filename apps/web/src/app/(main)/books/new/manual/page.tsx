import { hasRoleAtLeast } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddManualBookForm } from "@/components/blocks/book-flow/add-manual-book-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Add a book by hand",
	description:
		"Add a book Open Library does not have, together with its first edition.",
	robots: NO_INDEX_ROBOTS,
	path: "/books/new/manual",
});

export default async function AddManualBookPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!hasRoleAtLeast(session?.user, "admin")) {
		redirect("/books" as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-col gap-3 border-border border-b pb-5">
				<Button
					render={<Link href={"/books/new" as Route} />}
					nativeButton={false}
					variant="ghost"
					size="sm"
					className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Back to Open Library search
				</Button>
				<div className="space-y-1">
					<h1 className="font-bold text-2xl tracking-tight">
						Add a book by hand
					</h1>
					<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
						For books Open Library does not have. Fill in the work and its first
						edition together: the page count and the cover come from the
						edition, so you enter them once. Press{" "}
						<kbd className="border border-border bg-muted px-1 font-mono text-2xs">
							Ctrl
						</kbd>{" "}
						<kbd className="border border-border bg-muted px-1 font-mono text-2xs">
							Enter
						</kbd>{" "}
						to save.
					</p>
				</div>
			</header>
			<AddManualBookForm />
		</div>
	);
}
