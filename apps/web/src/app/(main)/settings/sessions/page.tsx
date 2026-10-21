import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { RedirectType, redirect } from "next/navigation";
import {
	type SettingsSessionItem,
	SettingsSessionsList,
} from "@/components/blocks/settings-sessions-list";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth, db } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Sessions",
	description: "Manage your active sessions.",
	path: "/settings/sessions",
	robots: NO_INDEX_ROBOTS,
});

export default async function SessionSettingsPage() {
	const nextHeaders = await headers();
	const session = await auth.api.getSession({ headers: nextHeaders });

	if (!session) {
		redirect("/sign-in" as Route, RedirectType.replace);
	}

	// auth.api.listSessions requires a fresh session (signed in within freshAge),
	// which would break this page for anyone logged in for more than a day.
	const sessions = await db.session.findMany({
		where: { userId: session.user.id, expiresAt: { gt: new Date() } },
		orderBy: { createdAt: "desc" },
	});

	const items: SettingsSessionItem[] = sessions.map((item) => ({
		token: item.token,
		ipAddress: item.ipAddress ?? null,
		userAgent: item.userAgent ?? null,
		createdAt: item.createdAt.toISOString(),
		isCurrent: item.token === session.session.token,
	}));

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
				<h1 className="font-semibold text-2xl tracking-tight">Sessions</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Devices where you are signed in. Log out of any you don't recognize.
				</p>
			</div>

			<SettingsSessionsList sessions={items} />
		</div>
	);
}
