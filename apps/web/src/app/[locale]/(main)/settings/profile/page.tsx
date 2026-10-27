import { toLocale } from "@bbrc/i18n";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsProfileForm } from "@/components/blocks/settings-profile-form";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/settings/profile">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "settings" });
	return buildPageMetadata({
		title: t("profile.metaTitle"),
		description: t("profile.metaDescription"),
		path: "/settings/profile",
		robots: NO_INDEX_ROBOTS,
		locale,
	});
}

export default async function ProfileSettingsPage({
	params,
}: PageProps<"/[locale]/settings/profile">) {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "settings" });
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
					{t("back")}
				</Link>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("profile.title")}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("profile.intro")}
				</p>
			</div>

			<SettingsProfileForm />
		</div>
	);
}
