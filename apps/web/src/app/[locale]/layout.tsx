import { pickMessages } from "@bbrc/i18n";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { RootDocument } from "@/components/root-document";
import { routing } from "@/i18n/routing";
import {
	DEFAULT_DESCRIPTION,
	getMetadataBase,
	SITE_NAME,
	SITE_SHORT_NAME,
} from "@/lib/seo";

export const metadata: Metadata = {
	metadataBase: getMetadataBase(),
	applicationName: SITE_SHORT_NAME,
	title: {
		template: `%s | ${SITE_NAME}`,
		default: SITE_NAME,
	},
	description: DEFAULT_DESCRIPTION,
	appleWebApp: {
		capable: true,
		title: SITE_SHORT_NAME,
		statusBarStyle: "default",
	},
	formatDetection: {
		telephone: false,
	},
	verification: {
		google: "rIMlWBrMSHm5mzjArO08Z1dffX4ecsoPbY6IwY0TNqA",
	},
};

export const viewport: Viewport = {
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#252525" },
	],
};

/** English is pre-built; other languages are generated on the first visit and then cached. */
export function generateStaticParams() {
	return [{ locale: routing.defaultLocale }];
}

export default async function LocaleLayout({
	children,
	params,
}: LayoutProps<"/[locale]">) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}
	setRequestLocale(locale);

	return (
		<RootDocument
			lang={locale}
			intl={{
				locale,
				messages: pickMessages(locale, ["language", "notifications"]),
			}}
		>
			{children}
		</RootDocument>
	);
}
