import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateSittingForm } from "@/components/blocks/create-sitting-form";
import { auth } from "@/services";

export const metadata: Metadata = {
	title: "Start sitting",
	description: "Start a new club reading sitting and book poll.",
};

export default async function NewSittingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/sittings" as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="space-y-1">
				<h1 className="font-bold text-2xl">Start new sitting</h1>
				<p className="text-muted-foreground text-sm">
					Choose participants and configure the wishlist book poll. Only one
					sitting can be active at a time.
				</p>
			</div>
			<CreateSittingForm />
		</div>
	);
}
