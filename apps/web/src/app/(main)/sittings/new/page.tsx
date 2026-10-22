import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateSittingForm } from "@/components/blocks/create-sitting-form";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Start sitting",
	description: "Start a new club reading sitting and book poll.",
	path: "/sittings/new",
});

export default async function NewSittingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/sittings" as Route);
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<header className="flex max-w-2xl flex-col gap-1.5">
				<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
					Start a sitting
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Choose who is reading and when voting closes, narrow the pool of
					wishlist books, then check the random draw before the poll opens. Only
					one sitting runs at a time.
				</p>
			</header>
			<CreateSittingForm />
		</div>
	);
}
