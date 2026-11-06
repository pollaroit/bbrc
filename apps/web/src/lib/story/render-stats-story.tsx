import type { StatsShareFacts } from "@bbrc/shared";
import { ImageResponse } from "next/og";
import { bookCoverUrl } from "@/lib/book-cover";
import { getOgFonts } from "@/lib/seo/og/fonts";
import { ogImageData } from "@/lib/seo/og/images";
import { SITE_SHORT_NAME } from "@/lib/seo/site";
import { SESSION_STORY_SHAPES, type StatsStoryShape } from "./constants";

const INK = "#fafafa";
const MUTED = "rgba(250, 250, 250, 0.55)";
const FAINT = "rgba(250, 250, 250, 0.12)";

/** How many covers each shape has room for. */
export const STATS_STORY_COVERS: Record<StatsStoryShape, number> = {
	story: 6,
	post: 4,
};

function titleSize(title: string, compact: boolean): number {
	const base = title.length > 36 ? 60 : title.length > 26 ? 72 : 84;
	return compact ? Math.round(base * 0.8) : base;
}

/**
 * A member's stats as a picture: the title, a few numbers, the books as covers and a line
 * about taste. Satori only lays out flexbox, so every box with more than one child is flex.
 */
export async function renderStatsStoryImage(
	facts: StatsShareFacts,
	shape: StatsStoryShape,
): Promise<ImageResponse> {
	const { width, height } = SESSION_STORY_SHAPES[shape];
	const compact = shape === "post";
	const padX = 72;
	const gap = 24;
	const perRow = compact ? 4 : 3;
	const coverWidth = Math.floor(
		(width - padX * 2 - gap * (perRow - 1)) / perRow,
	);
	const coverHeight = Math.round(coverWidth * 1.5);

	const covers = await Promise.all(
		facts.covers.map(async (book) => ({
			...book,
			src: await ogImageData(bookCoverUrl(book.coverId, "L")),
		})),
	);
	const rows: (typeof covers)[] = [];
	for (let index = 0; index < covers.length; index += perRow) {
		rows.push(covers.slice(index, index + perRow));
	}

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: compact ? `56px ${padX}px 52px` : `96px ${padX}px 84px`,
				background:
					"linear-gradient(168deg, #0a0a0a 0%, #121212 38%, #0d0d0d 72%, #050505 100%)",
				color: INK,
				fontFamily: "Geist Mono",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: 24,
					color: MUTED,
				}}
			>
				<div
					style={{ display: "flex", fontWeight: 600, letterSpacing: "0.08em" }}
				>
					{SITE_SHORT_NAME}
				</div>
				<div style={{ display: "flex" }}>{facts.periodLabel}</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: compact ? 28 : 48,
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: titleSize(facts.title, compact),
						fontWeight: 700,
						lineHeight: 1.08,
						letterSpacing: "-0.03em",
						maxHeight: titleSize(facts.title, compact) * 1.08 * 3,
						overflow: "hidden",
					}}
				>
					{facts.title}
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
					{facts.numbers.map((number) => (
						<div
							key={number.label}
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 6,
								width: Math.floor((width - padX * 2 - 20) / 2),
								padding: "18px 24px",
								border: `1px solid ${FAINT}`,
								background: "rgba(250, 250, 250, 0.04)",
							}}
						>
							<div
								style={{
									display: "flex",
									fontSize: compact ? 52 : 64,
									fontWeight: 700,
									letterSpacing: "-0.02em",
								}}
							>
								{number.value}
							</div>
							<div style={{ display: "flex", fontSize: 24, color: MUTED }}>
								{number.label}
							</div>
						</div>
					))}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap }}>
				{rows.map((row, rowIndex) => (
					<div key={rowIndex} style={{ display: "flex", gap }}>
						{row.map((book) => (
							<div
								key={book.slug}
								style={{
									display: "flex",
									width: coverWidth,
									height: coverHeight,
									background: "rgba(250, 250, 250, 0.06)",
									border: `1px solid ${FAINT}`,
									alignItems: "center",
									justifyContent: "center",
									overflow: "hidden",
								}}
							>
								{book.src ? (
									// eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori)
									<img
										src={book.src}
										alt=""
										width={coverWidth}
										height={coverHeight}
										style={{
											objectFit: "cover",
											width: coverWidth,
											height: coverHeight,
										}}
									/>
								) : null}
							</div>
						))}
					</div>
				))}
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 10,
					fontSize: 26,
					color: MUTED,
				}}
			>
				{facts.highlights.map((line) => (
					<div key={line} style={{ display: "flex" }}>
						{line}
					</div>
				))}
				{facts.rankLine ? (
					<div style={{ display: "flex", color: INK, fontWeight: 600 }}>
						{facts.rankLine}
					</div>
				) : null}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginTop: 8,
					}}
				>
					<div style={{ display: "flex", color: INK, fontWeight: 600 }}>
						{facts.name}
					</div>
					<div style={{ display: "flex" }}>{`@${facts.username}`}</div>
				</div>
			</div>
		</div>,
		{
			width,
			height,
			fonts: getOgFonts(),
			headers: { "Cache-Control": "private, max-age=300" },
		},
	);
}
