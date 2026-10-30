import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsAvatarUpload } from "@/components/blocks/settings-avatar-upload";
import { SettingsNameForm } from "@/components/blocks/settings-name-form";
import { SettingsUsernameForm } from "@/components/blocks/settings-username-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Settings",
	description: "Manage your BBRC account preferences.",
	path: "/settings",
	robots: NO_INDEX_ROBOTS,
});

const settingsLinks = [
	{
		href: "/settings/preferences",
		title: "Preferences",
		description: "Theme, fonts, text size, reading and display options.",
	},
	{
		href: "/settings/profile",
		title: "Profile",
		description: "Birthday, bio, favorite genres, links and reading speed.",
	},
	{
		href: "/settings/privacy",
		title: "Privacy",
		description: "Who can see your profile, reads, reviews and more.",
	},
	{
		href: "/settings/following",
		title: "Following",
		description: "Authors you follow and new-book alerts.",
	},
	{
		href: "/settings/sessions",
		title: "Sessions",
		description: "See where you're signed in and log out of devices.",
	},
	{
		href: "/settings/notifications",
		title: "Notifications",
		description: "What reaches your bell and your phone, and your devices.",
	},
] as const;

export default async function SettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/sign-in" as Route);
	}

	const currentName = session.user.name;

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Preferences for your account.
				</p>
			</div>

			<section
				className="border border-border px-4 py-5"
				aria-labelledby="profile-photo-heading"
			>
				<SettingsAvatarUpload />
			</section>

			<section
				className="border border-border px-4 py-5"
				aria-labelledby="username-heading"
			>
				<h2 id="username-heading" className="sr-only">
					Username
				</h2>
				<SettingsUsernameForm />
			</section>

			<section
				className="border border-border px-4 py-5"
				aria-labelledby="name-heading"
			>
				<h2 id="name-heading" className="sr-only">
					Your Name
				</h2>
				<SettingsNameForm currentName={currentName} />
			</section>

			<ul className="divide-y border">
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
