import { toLocale } from "@bbrc/i18n";
import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsAvatarUpload } from "@/components/blocks/settings-avatar-upload";
import { SettingsNameForm } from "@/components/blocks/settings-name-form";
import { SettingsUsernameForm } from "@/components/blocks/settings-username-form";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/settings">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "settings" });
	return buildPageMetadata({
		title: t("index.metaTitle"),
		description: t("index.metaDescription"),
		path: "/settings",
		robots: NO_INDEX_ROBOTS,
		locale,
	});
}

const settingsLinks = [
	{ href: "/settings/preferences", key: "preferences" },
	{ href: "/settings/profile", key: "profile" },
	{ href: "/settings/following", key: "following" },
	{ href: "/settings/sessions", key: "sessions" },
	{ href: "/settings/notifications", key: "notifications" },
] as const;

export default async function SettingsPage({
	params,
}: PageProps<"/[locale]/settings">) {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "settings" });
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/sign-in" as Route);
	}

	const telegramLinked = Boolean(session.user.telegramUserId);
	const currentName = session.user.name;

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("index.title")}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">{t("index.intro")}</p>
			</div>

			{!telegramLinked ? (
				<section
					className="border border-border bg-muted/30 px-4 py-4 text-sm"
					aria-labelledby="telegram-nudge-heading"
				>
					<h2 id="telegram-nudge-heading" className="font-medium">
						Connect Telegram
					</h2>
					<p className="mt-1 text-muted-foreground leading-relaxed">
						Link your Telegram account so BBRC can recognize you in the club
						group bot.{" "}
						<Link
							href={"/settings/accounts" as Route}
							className="font-medium text-foreground underline underline-offset-4"
						>
							Account connections
						</Link>
					</p>
				</section>
			) : null}

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
					{t("index.usernameHeading")}
				</h2>
				<SettingsUsernameForm />
			</section>

			<section
				className="border border-border px-4 py-5"
				aria-labelledby="name-heading"
			>
				<h2 id="name-heading" className="sr-only">
					{t("index.nameHeading")}
				</h2>
				<SettingsNameForm currentName={currentName} />
			</section>

			<ul className="divide-y border">
				{/* Telegram linking is being removed: this row stays English until it goes. */}
				<li>
					<Link
						href={"/settings/accounts" as Route}
						className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
					>
						<span className="min-w-0">
							<span className="block font-medium text-sm">
								Account connections
							</span>
							<span className="block text-muted-foreground text-sm">
								Link Telegram for club bot features.
							</span>
						</span>
						<ChevronRight
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden
						/>
					</Link>
				</li>
				{settingsLinks.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href as Route}
							className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
						>
							<span className="min-w-0">
								<span className="block font-medium text-sm">
									{t(`index.links.${link.key}.title`)}
								</span>
								<span className="block text-muted-foreground text-sm">
									{t(`index.links.${link.key}.description`)}
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
