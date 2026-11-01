import { ImageResponse } from "next/og";
import { getOgFonts } from "@/lib/seo/og/fonts";
import { SITE_SHORT_NAME } from "@/lib/seo/site";
import { SESSION_STORY_SHAPES, type SessionStoryShape } from "./constants";
import type { SessionStoryContent } from "./session-story-content";

const INK = "#fafafa";
const MUTED = "rgba(250, 250, 250, 0.55)";
const FAINT = "rgba(250, 250, 250, 0.12)";

/** The numbers under the bar: only the ones this session has. */
function tiles(content: SessionStoryContent) {
	const { facts, streakDays } = content;
	const out: { value: string; label: string }[] = [];
	if (facts.pages != null && facts.pages > 0) {
		out.push({
			value: `+${facts.pages}`,
			label: facts.pages === 1 ? "page" : "pages",
		});
	} else if (facts.percentGained > 0) {
		out.push({ value: `+${facts.percentGained}%`, label: "of the book" });
	}
	if (facts.speed != null) {
		out.push({
			value: String(Math.round(facts.speed)),
			label: "pages per hour",
		});
	}
	if (streakDays > 1) {
		out.push({ value: String(streakDays), label: "days in a row" });
	}
	return out;
}

/** The line under the clock: the method, and how a countdown ended. */
function caption(facts: SessionStoryContent["facts"]): string {
	if (facts.targetMet === true) return `${facts.method}, reached the target`;
	if (facts.targetMet === false) return `${facts.method}, stopped early`;
	return facts.method;
}

function titleSize(title: string, compact: boolean): number {
	const base = title.length > 60 ? 40 : title.length > 38 ? 46 : 54;
	return compact ? Math.round(base * 0.85) : base;
}

/**
 * A finished session as a picture: the book, how long it was read, where in
 * the book it got to, and a few numbers. Satori only lays out flexbox, so every
 * box with more than one child is a flex box.
 */
export async function renderSessionStoryImage(
	content: SessionStoryContent,
	shape: SessionStoryShape,
): Promise<ImageResponse> {
	const { width, height } = SESSION_STORY_SHAPES[shape];
	const compact = shape === "post";
	const padX = 72;
	const trackWidth = width - padX * 2;
	const coverWidth = compact ? 270 : 400;
	const coverHeight = Math.round(coverWidth * 1.5);
	const { facts } = content;
	const stats = tiles(content);
	const from = Math.min(100, Math.max(0, facts.percentFrom));
	const to = Math.min(100, Math.max(from, facts.percentTo));
	const filledLeft = Math.round((from / 100) * trackWidth);
	const filledWidth = Math.max(
		10,
		Math.round(((to - from) / 100) * trackWidth),
	);

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
				<div style={{ display: "flex" }}>{content.dayLabel}</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: compact ? 22 : 36,
				}}
			>
				<div
					style={{
						display: "flex",
						width: coverWidth,
						height: coverHeight,
						background: "rgba(250, 250, 250, 0.06)",
						boxShadow: "0 24px 64px rgba(0, 0, 0, 0.45)",
						border: `1px solid ${FAINT}`,
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
					}}
				>
					{content.coverUrl ? (
						// eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori)
						<img
							src={content.coverUrl}
							alt=""
							width={coverWidth}
							height={coverHeight}
							style={{
								objectFit: "contain",
								width: coverWidth,
								height: coverHeight,
							}}
						/>
					) : null}
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 8,
						textAlign: "center",
						maxWidth: width - padX * 2,
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							fontSize: titleSize(content.title, compact),
							fontWeight: 600,
							lineHeight: 1.15,
							letterSpacing: "-0.02em",
							maxHeight: titleSize(content.title, compact) * 1.15 * 2,
							overflow: "hidden",
						}}
					>
						{content.title}
					</div>
					<div
						style={{
							display: "flex",
							fontSize: 26,
							color: MUTED,
							maxHeight: 72,
							overflow: "hidden",
						}}
					>
						{content.authorsLine}
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 6,
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: compact ? 150 : 190,
						fontWeight: 600,
						lineHeight: 1,
						letterSpacing: "-0.04em",
					}}
				>
					{facts.clock}
				</div>
				<div style={{ display: "flex", fontSize: 28, color: MUTED }}>
					{caption(facts)}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				<div
					style={{
						display: "flex",
						position: "relative",
						width: trackWidth,
						height: 18,
						background: FAINT,
					}}
				>
					<div
						style={{
							display: "flex",
							position: "absolute",
							top: 0,
							left: filledLeft,
							width: filledWidth,
							height: 18,
							background: INK,
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: 24,
						color: MUTED,
					}}
				>
					<div style={{ display: "flex" }}>{`${from}%`}</div>
					<div style={{ display: "flex" }}>
						{facts.finished ? "Finished the book" : `${to}% of the book`}
					</div>
				</div>
			</div>

			{stats.length > 0 ? (
				<div
					style={{
						display: "flex",
						justifyContent: "space-around",
						width: "100%",
					}}
				>
					{stats.map((tile) => (
						<div
							key={tile.label}
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 6,
							}}
						>
							<div
								style={{
									display: "flex",
									fontSize: compact ? 52 : 64,
									fontWeight: 600,
									lineHeight: 1,
								}}
							>
								{tile.value}
							</div>
							<div style={{ display: "flex", fontSize: 24, color: MUTED }}>
								{tile.label}
							</div>
						</div>
					))}
				</div>
			) : null}

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: 26,
					color: MUTED,
				}}
			>
				<div style={{ display: "flex", color: INK, fontWeight: 600 }}>
					{content.memberName}
				</div>
				<div style={{ display: "flex" }}>{`@${content.username}`}</div>
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
