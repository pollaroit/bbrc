import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { RedirectType, redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/blocks/change-password-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Security",
	description: "Password and account security.",
	path: "/settings/security",
	robots: NO_INDEX_ROBOTS,
});

export default async function SecuritySettingsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/sign-in" as Route, RedirectType.replace);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
			<div className="flex flex-col gap-2">
				<Link
					href={"/settings" as Route}
					className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Settings
				</Link>
				<h1 className="font-bold text-2xl tracking-tight">Security</h1>
				<p className="text-muted-foreground text-sm">
					Change your password. We email you when it changes.
				</p>
			</div>
			<ChangePasswordForm />
		</div>
	);
}
