import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TelegramLinkSettings } from "@/components/blocks/telegram-link-settings";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Account connections",
	description: "Link Telegram and other external accounts to BBRC.",
	path: "/settings/accounts",
	robots: NO_INDEX_ROBOTS,
});

export default async function AccountSettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/sign-in" as Route);
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-8">
			<div>
				<Link
					href={"/settings" as Route}
					className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Settings
				</Link>
				<h1 className="font-semibold text-2xl tracking-tight">
					Account connections
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Link external services to your BBRC profile. Your email and password
					stay your primary login.
				</p>
			</div>

			<TelegramLinkSettings />
		</div>
	);
}
