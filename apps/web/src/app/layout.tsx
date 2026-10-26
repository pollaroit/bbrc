import type { Metadata, Viewport } from "next";
import {
	Bricolage_Grotesque,
	Fraunces,
	Geist,
	Geist_Mono,
	IBM_Plex_Sans,
	Inter,
	Literata,
	Playfair_Display,
	Source_Serif_4,
	Space_Grotesk,
} from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";

import "../index.css";

import { buildBootScript, PALETTES } from "@bbrc/shared";
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

/** The default font preloads Latin only; other glyphs load when a page needs them. */
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});
const geistMonoExtended = Geist_Mono({
	variable: "--font-geist-mono-ext",
	subsets: ["latin-ext", "cyrillic"],
	preload: false,
});

/**
 * Fonts members can choose in Preferences. `preload: false` means a font only
 * downloads once someone selects it, so these cost a little CSS and no network.
 * (next/font needs literal options, so they are repeated on each font.)
 */
const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});
const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});
const plexSans = IBM_Plex_Sans({
	variable: "--font-plex-sans",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});
/**
 * Atkinson Hyperlegible Next is bundled (SIL Open Font License, see THIRD_PARTY_NOTICES.md).
 * next/font/google cannot calculate a fallback for it and warns on every build, so the two
 * Google Fonts subsets are served from here, each with its own unicode-range.
 */
const atkinson = localFont({
	variable: "--font-atkinson",
	src: [
		{
			path: "./fonts/atkinson-hyperlegible-next-latin.woff2",
			weight: "200 800",
			style: "normal",
		},
	],
	declarations: [
		{
			prop: "unicode-range",
			value:
				"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
		},
	],
	adjustFontFallback: false,
	preload: false,
	display: "swap",
});
const atkinsonExtended = localFont({
	variable: "--font-atkinson-ext",
	src: [
		{
			path: "./fonts/atkinson-hyperlegible-next-latin-ext.woff2",
			weight: "200 800",
			style: "normal",
		},
	],
	declarations: [
		{
			prop: "unicode-range",
			value:
				"U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
		},
	],
	adjustFontFallback: false,
	preload: false,
	display: "swap",
});
const literata = Literata({
	variable: "--font-literata",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});
const sourceSerif = Source_Serif_4({
	variable: "--font-source-serif",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});
const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin", "latin-ext"],
	preload: false,
	display: "swap",
});
const bricolage = Bricolage_Grotesque({
	variable: "--font-bricolage",
	subsets: ["latin", "latin-ext"],
	preload: false,
	display: "swap",
});
const fraunces = Fraunces({
	variable: "--font-fraunces",
	subsets: ["latin", "latin-ext"],
	preload: false,
	display: "swap",
});
const playfair = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin", "latin-ext", "cyrillic"],
	preload: false,
	display: "swap",
});

const fontVariables = [
	geistMono,
	geistMonoExtended,
	geistSans,
	inter,
	plexSans,
	atkinson,
	atkinsonExtended,
	literata,
	sourceSerif,
	spaceGrotesk,
	bricolage,
	fraunces,
	playfair,
]
	.map((font) => font.variable)
	.join(" ");

/** Boot script: sets palette, fonts, size and motion before first paint. */
const preferencesBootScript = buildBootScript(
	Object.fromEntries(
		PALETTES.flatMap((palette) =>
			palette.modes.length === 1 ? [[palette.id, palette.modes[0]]] : [],
		),
	),
);

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
			className={`${fontVariables} min-h-dvh bg-background text-foreground`}
			// The boot script below sets data-palette, data-font-*, data-text-size and
			// friends before first paint. They are deliberately not React props, so
			// hydration cannot reset them; CSS defaults cover the no-script case.
			suppressHydrationWarning
		>
			<head>
				{/* next/script (not a bare <script>): React warns about scripts rendered by components. */}
				<Script
					id="preferences-boot"
					strategy="beforeInteractive"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static boot script built from constants
					dangerouslySetInnerHTML={{ __html: preferencesBootScript }}
				/>
			</head>
			<body className="min-h-dvh bg-background font-sans text-foreground antialiased">
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
