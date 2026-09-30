import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Settings",
	description: "Manage your BBRC account preferences.",
	path: "/settings",
});

const settingsLinks = [
	{
		href: "/settings/notifications",
		title: "Notifications",
		description: "Bell alerts and one-time ntfy phone setup.",
	},
] as const;

export default async function SettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/sign-in" as Route);
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Preferences for your account.
				</p>
			</div>

			<ul className="divide-y rounded-lg border">
				{settingsLinks.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href as Route}
							className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
						>
							<span className="min-w-0">
								<span className="block font-medium text-sm">{link.title}</span>
								<span className="block text-muted-foreground text-sm">
									{link.description}
								</span>
							</span>
							<ChevronRight
								className="size-4 shrink-0 text-muted-foreground"
								aria-hidden
							/>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
