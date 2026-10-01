import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_SHORT_NAME } from "../site";
import { getOgFonts } from "./fonts";

export type OgImageContent = {
	title: string;
	description?: string;
	/** Small label above the title, e.g. Book, Post, Member. */
	kind?: string;
	/** Short stat chips between description and footer. */
	highlights?: string[];
};

export async function renderOgImage(
	content: OgImageContent,
): Promise<ImageResponse> {
	const description = content.description?.trim() || DEFAULT_DESCRIPTION;
	const fonts = getOgFonts();
	const highlights = content.highlights?.filter(Boolean) ?? [];

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "64px 72px",
				background:
					"linear-gradient(145deg, #0c0c0c 0%, #171717 45%, #1a1a1a 100%)",
				color: "#fafafa",
				fontFamily: "Geist Mono",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				{content.kind ? (
					<div
						style={{
							display: "flex",
							alignSelf: "flex-start",
							padding: "8px 16px",
							background: "rgba(250, 250, 250, 0.12)",
							fontSize: 22,
							fontWeight: 600,
							letterSpacing: "0.06em",
							textTransform: "uppercase",
						}}
					>
						{content.kind}
					</div>
				) : null}
				<div
					style={{
						fontSize: content.title.length > 48 ? 52 : 64,
						fontWeight: 600,
						lineHeight: 1.1,
						letterSpacing: "-0.02em",
						maxHeight: 220,
						overflow: "hidden",
					}}
				>
					{content.title}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<div
					style={{
						fontSize: 28,
						lineHeight: 1.45,
						color: "rgba(250, 250, 250, 0.78)",
						maxHeight: highlights.length > 0 ? 96 : 120,
						overflow: "hidden",
					}}
				>
					{description}
				</div>
				{highlights.length > 0 ? (
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 10,
							maxHeight: 88,
							overflow: "hidden",
						}}
					>
						{highlights.slice(0, 5).map((item) => (
							<div
								key={item}
								style={{
									display: "flex",
									padding: "6px 14px",
									background: "rgba(250, 250, 250, 0.08)",
									fontSize: 20,
									color: "rgba(250, 250, 250, 0.88)",
								}}
							>
								{item}
							</div>
						))}
					</div>
				) : null}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderTop: "1px solid rgba(250, 250, 250, 0.15)",
						paddingTop: 24,
					}}
				>
					<span style={{ fontSize: 32, fontWeight: 600 }}>
						{SITE_SHORT_NAME}
					</span>
					<span style={{ fontSize: 22, color: "rgba(250, 250, 250, 0.5)" }}>
						Brigada Book Reading Club
					</span>
				</div>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts,
		},
	);
}
