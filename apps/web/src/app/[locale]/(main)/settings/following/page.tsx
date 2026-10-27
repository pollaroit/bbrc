import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsFollowing } from "@/components/blocks/settings-following";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Following",
	description: "The authors you follow on BBRC.",
	path: "/settings/following",
	robots: NO_INDEX_ROBOTS,
});

export default async function FollowingSettingsPage() {
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
				<h1 className="font-semibold text-2xl tracking-tight">Following</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Authors you follow. When the library adds a book by one of them you
					get a notification; switch that on or off in{" "}
					<Link
						href={"/settings/notifications" as Route}
						className="font-medium text-foreground underline underline-offset-4"
					>
						Notifications
					</Link>
					.
				</p>
			</div>

			<SettingsFollowing />
		</div>
	);
}
