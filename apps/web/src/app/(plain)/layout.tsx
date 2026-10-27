import type { Metadata, Viewport } from "next";
import { PlainPageLang } from "@/components/blocks/plain-page-lang";
import { RootDocument } from "@/components/root-document";
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

/** Pages outside the language segment (the offline page, the feeds index): English. */
export default function PlainLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<RootDocument lang="en">
			<PlainPageLang />
			{children}
		</RootDocument>
	);
}
