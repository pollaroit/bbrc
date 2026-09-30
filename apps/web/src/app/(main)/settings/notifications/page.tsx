import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/components/blocks/notification-preferences-form";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Notification settings",
	description: "Choose in-app and push notifications for BBRC.",
	path: "/settings/notifications",
});

export default async function NotificationSettingsPage() {
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
				<h1 className="font-semibold text-2xl tracking-tight">Notifications</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Choose what appears in the bell on the site and what is sent to your
					phone through ntfy. Set up phone push once using your personal topic
					below.
				</p>
			</div>

			<NotificationPreferencesForm />
		</div>
	);
}
