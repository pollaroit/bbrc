import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";

import "../index.css";

import { SerwistProvider } from "@serwist/turbopack/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "@/components/providers";
import { DefaultSiteJsonLd } from "@/components/seo/default-site-json-ld";
import {
	DEFAULT_DESCRIPTION,
	getMetadataBase,
	SITE_NAME,
	SITE_SHORT_NAME,
} from "@/lib/seo";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className="min-h-dvh bg-background text-foreground"
			suppressHydrationWarning
		>
			<body
				className={`${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
			>
				<DefaultSiteJsonLd />
				<SerwistProvider swUrl="/serwist/sw.js">
					<Providers>{children}</Providers>
				</SerwistProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
