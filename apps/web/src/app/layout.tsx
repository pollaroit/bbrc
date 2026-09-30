import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		template: "%s | Brigada Book Reading Club",
		default: "Brigada Book Reading Club",
	},
	description:
		"Brigada Book Reading Club (a.k.a. BBRC) is a parallel book reading club for members of Brigada.",
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
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
