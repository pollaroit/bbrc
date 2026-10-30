import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivacySettingsForm } from "@/components/blocks/privacy-settings-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Privacy",
	description: "Choose who can see your profile and what you share.",
	path: "/settings/privacy",
	robots: NO_INDEX_ROBOTS,
});

export default async function PrivacySettingsPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in" as Route);
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-8">
			<div>
				<Link
					href={"/settings" as Route}
					className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Settings
				</Link>
				<h1 className="font-semibold text-2xl tracking-tight">Privacy</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Decide who can see your profile and the things you share. Friends are
					people you both agreed to be friends with.
				</p>
			</div>
			<PrivacySettingsForm />
		</div>
	);
}
