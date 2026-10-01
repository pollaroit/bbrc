import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import "../index.css";

import { Analytics } from "@vercel/analytics/next";
import Providers from "@/components/providers";
import { DefaultSiteJsonLd } from "@/components/seo/default-site-json-ld";
import { DEFAULT_DESCRIPTION, getMetadataBase, SITE_NAME } from "@/lib/seo";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: getMetadataBase(),
	title: {
		template: `%s | ${SITE_NAME}`,
		default: SITE_NAME,
	},
	description: DEFAULT_DESCRIPTION,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className="min-h-full bg-background text-foreground"
			suppressHydrationWarning
		>
			<body
				className={`${geistMono.variable} min-h-full bg-background font-sans text-foreground antialiased`}
			>
				<DefaultSiteJsonLd />
				<Providers>{children}</Providers>
				<Analytics />
			</body>
		</html>
	);
}
