import { toLocale } from "@bbrc/i18n";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { PreferencesForm } from "@/components/blocks/preferences-form";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/settings/preferences">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "preferences" });
	return buildPageMetadata({
		title: t("page.metaTitle"),
		description: t("page.metaDescription"),
		path: "/settings/preferences",
		robots: NO_INDEX_ROBOTS,
		locale,
	});
}

/** Open to everyone: visitors keep their choices on their own device. */
export default async function PreferencesPage({
	params,
}: PageProps<"/[locale]/settings/preferences">) {
	const locale = toLocale((await params).locale);
	const settingsT = await getTranslations({ locale, namespace: "settings" });
	const t = await getTranslations({ locale, namespace: "preferences" });
	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-8">
			<div>
				<Link
					href={"/settings" as Route}
					className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					{settingsT("back")}
				</Link>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("page.title")}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">{t("page.intro")}</p>
			</div>

			<PreferencesForm />
		</div>
	);
}
