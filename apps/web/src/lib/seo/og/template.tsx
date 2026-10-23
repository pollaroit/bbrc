import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_SHORT_NAME } from "../site";
import { getOgFonts } from "./fonts";

/** One labelled figure in the bottom row. */
export type OgFact = {
	label: string;
	value: string;
	/** Small muted line under the value, e.g. "from 3 of 5 books". */
	hint?: string;
	/** Optional visual under the value. */
	meter?:
		| { kind: "rating"; value: number }
		| { kind: "progress"; ratio: number };
};

/** The picture on the left. Images are data URIs from `ogImageData`. */
export type OgMedia =
	| { kind: "cover"; src: string }
	| { kind: "avatar"; src: string | null; initial: string }
	| { kind: "photo"; src: string }
	| { kind: "covers"; srcs: string[] };

export type OgImageContent = {
	/** Category shown in the top-left cell: Book, Post, Member… */
	kind?: string;
	title: string;
	/** One line under the title: author, @user, context. */
	subtitle?: string;
	/** Longer text: description, excerpt, or the post/comment/review itself. */
	body?: string;
	/** Short status in the top-right cell, e.g. "Voting open". */
	badge?: string;
	/** Labelled figures along the bottom, ideally 2 to 4. */
	facts?: OgFact[];
	media?: OgMedia;
};

const WIDTH = 1200;
const HEIGHT = 630;
const FRAME = 28;
const HEADER_H = 64;
const FOOTER_H = 152;

const INK = "#fafafa";
const MUTED = "rgba(250, 250, 250, 0.6)";
const LINE = "rgba(250, 250, 250, 0.2)";
const AMBER = "#fbbf24";

const line = `1px solid ${LINE}`;

function RatingBlocks({ value }: { value: number }) {
	const lit = Math.round(value * 2);
	return (
		<div style={{ display: "flex", gap: 3, marginTop: 10 }}>
			{Array.from({ length: 10 }, (_, index) => (
				<div
					key={index}
					style={{
						width: 14,
						height: 14,
						background: index < lit ? AMBER : "rgba(250, 250, 250, 0.14)",
					}}
				/>
			))}
		</div>
	);
}

function ProgressBar({ ratio }: { ratio: number }) {
	const clamped = Math.min(1, Math.max(0, ratio));
	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				height: 14,
				marginTop: 10,
				background: "rgba(250, 250, 250, 0.14)",
			}}
		>
			<div
				style={{
					width: `${clamped * 100}%`,
					height: 14,
					background: AMBER,
				}}
			/>
		</div>
	);
}

function Media({ media, height }: { media: OgMedia; height: number }) {
	if (media.kind === "cover") {
		const coverH = Math.min(height - 56, 360);
		return (
			// biome-ignore lint/performance/noImgElement: satori image
			<img
				src={media.src}
				alt=""
				width={Math.round((coverH * 2) / 3)}
				height={coverH}
				style={{ objectFit: "cover", border: line }}
			/>
		);
	}

	if (media.kind === "avatar") {
		const size = Math.min(height - 56, 264);
		return media.src ? (
			// biome-ignore lint/performance/noImgElement: satori image
			<img
				src={media.src}
				alt=""
				width={size}
				height={size}
				style={{ objectFit: "cover", border: line }}
			/>
		) : (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: size,
					height: size,
					border: line,
					background: "rgba(250, 250, 250, 0.08)",
					fontSize: 120,
					fontWeight: 600,
				}}
			>
				{media.initial.slice(0, 1).toUpperCase()}
			</div>
		);
	}

	if (media.kind === "photo") {
		return (
			// biome-ignore lint/performance/noImgElement: satori image
			<img
				src={media.src}
				alt=""
				width={320}
				height={height}
				style={{ objectFit: "cover" }}
			/>
		);
	}

	const covers = media.srcs.slice(0, 6);
	const columns = covers.length <= 2 ? covers.length : 3;
	const gap = 8;
	const coverW =
		columns === 1 ? 180 : columns === 2 ? 130 : Math.floor((284 - gap * 2) / 3);
	const coverH = Math.round((coverW * 3) / 2);

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				justifyContent: "center",
				gap,
				width: columns * coverW + (columns - 1) * gap,
			}}
		>
			{covers.map((src, index) => (
				// biome-ignore lint/performance/noImgElement: satori image
				<img
					key={`${index}-${src.length}`}
					src={src}
					alt=""
					width={coverW}
					height={coverH}
					style={{ objectFit: "cover", border: line }}
				/>
			))}
		</div>
	);
}

/** Largest size (up to 38px) at which the value fits its cell on one line; 22px (two lines) otherwise. */
function factFontSize(value: string, cells: number): number {
	const available = (WIDTH - FRAME * 2) / Math.max(1, cells) - 56;
	const fit = Math.floor(available / (Math.max(1, value.length) * 0.6));
	// Long values wrap onto two lines at a steady size instead of shrinking away.
	return fit < 26 ? 22 : Math.min(38, fit);
}

function titleSize(length: number, hasBody: boolean): number {
	if (length > 80) return hasBody ? 40 : 46;
	if (length > 48) return hasBody ? 48 : 56;
	return hasBody ? 56 : 68;
}

function bodySize(length: number, hasTitle: boolean): number {
	if (!hasTitle) {
		return length > 180 ? 34 : length > 90 ? 40 : 48;
	}
	return length > 200 ? 24 : 28;
}

export async function renderOgImage(
	content: OgImageContent,
): Promise<ImageResponse> {
	const fonts = getOgFonts();
	const facts = content.facts?.filter((fact) => fact.value) ?? [];
	const body = content.body?.trim() || undefined;
	const media = content.media;
	const mainHeight = HEIGHT - FRAME * 2 - HEADER_H - FOOTER_H;
	const quoteLayout =
		body != null && content.kind != null && QUOTE_KINDS.has(content.kind);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				padding: FRAME,
				background: "#0b0b0c",
				color: INK,
				fontFamily: "Geist Mono",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
					border: line,
				}}
			>
				{/* Header: category | status | brand */}
				<div
					style={{
						display: "flex",
						height: HEADER_H,
						borderBottom: line,
						alignItems: "stretch",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							padding: "0 28px",
							background: INK,
							color: "#0b0b0c",
							fontSize: 22,
							fontWeight: 600,
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						{content.kind ?? SITE_SHORT_NAME}
					</div>
					<div style={{ display: "flex", flex: 1 }} />
					{content.badge ? (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								padding: "0 28px",
								borderLeft: line,
								fontSize: 20,
								color: AMBER,
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							{content.badge}
						</div>
					) : null}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							padding: "0 28px",
							borderLeft: line,
							fontSize: 26,
							fontWeight: 600,
						}}
					>
						{SITE_SHORT_NAME}
					</div>
				</div>

				{/* Main: media | text */}
				<div style={{ display: "flex", height: mainHeight }}>
					{media ? (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: media.kind === "photo" ? 320 : 340,
								height: mainHeight,
								borderRight: line,
								overflow: "hidden",
								background: "rgba(250, 250, 250, 0.03)",
							}}
						>
							<Media media={media} height={mainHeight} />
						</div>
					) : null}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							justifyContent: "center",
							gap: 18,
							padding: "28px 44px",
							overflow: "hidden",
						}}
					>
						{quoteLayout ? (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 6,
									fontSize: 26,
								}}
							>
								<span style={{ fontWeight: 600 }}>{content.title}</span>
								{content.subtitle ? (
									<span style={{ color: MUTED, fontSize: 22 }}>
										{content.subtitle}
									</span>
								) : null}
							</div>
						) : (
							<div
								style={{
									display: "block",
									fontSize: titleSize(content.title.length, body != null),
									fontWeight: 600,
									lineHeight: 1.1,
									letterSpacing: "-0.02em",
									lineClamp: 3,
									textOverflow: "ellipsis",
								}}
							>
								{content.title}
							</div>
						)}
						{!quoteLayout && content.subtitle ? (
							<div
								style={{
									display: "block",
									fontSize: 28,
									color: INK,
									lineClamp: 1,
									textOverflow: "ellipsis",
								}}
							>
								{content.subtitle}
							</div>
						) : null}
						{body ? (
							<div
								style={{
									display: "block",
									fontSize: bodySize(body.length, !quoteLayout),
									lineHeight: 1.4,
									color: quoteLayout ? INK : MUTED,
									borderLeft: quoteLayout ? `3px solid ${AMBER}` : "none",
									paddingLeft: quoteLayout ? 22 : 0,
									lineClamp: quoteLayout ? 6 : 3,
									textOverflow: "ellipsis",
								}}
							>
								{body}
							</div>
						) : null}
						{!body && !content.subtitle && !media ? (
							<div style={{ display: "flex", fontSize: 28, color: MUTED }}>
								{DEFAULT_DESCRIPTION}
							</div>
						) : null}
					</div>
				</div>

				{/* Footer: facts divided by lines */}
				<div
					style={{
						display: "flex",
						height: FOOTER_H,
						borderTop: line,
					}}
				>
					{facts.length > 0 ? (
						facts.slice(0, 4).map((fact, index) => (
							<div
								key={fact.label}
								style={{
									display: "flex",
									flexDirection: "column",
									justifyContent: "flex-start",
									flex: 1,
									minWidth: 0,
									padding: "20px 28px 0",
									borderLeft: index === 0 ? "none" : line,
								}}
							>
								<span
									style={{
										fontSize: 16,
										color: MUTED,
										letterSpacing: "0.1em",
										textTransform: "uppercase",
									}}
								>
									{fact.label}
								</span>
								<span
									style={{
										display: "block",
										marginTop: 6,
										fontSize: factFontSize(
											fact.value,
											Math.min(4, facts.length),
										),
										fontWeight: 600,
										lineHeight: 1.15,
										...(factFontSize(fact.value, Math.min(4, facts.length)) < 26
											? { lineClamp: 2, textOverflow: "ellipsis" }
											: { whiteSpace: "nowrap" }),
									}}
								>
									{fact.value}
								</span>
								{fact.meter?.kind === "rating" ? (
									<RatingBlocks value={fact.meter.value} />
								) : fact.meter?.kind === "progress" ? (
									<ProgressBar ratio={fact.meter.ratio} />
								) : null}
								{fact.hint ? (
									<span
										style={{
											marginTop: 8,
											fontSize: 16,
											color: MUTED,
											whiteSpace: "nowrap",
										}}
									>
										{fact.hint}
									</span>
								) : null}
							</div>
						))
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								padding: "0 28px",
								fontSize: 22,
								color: MUTED,
							}}
						>
							Brigada Book Reading Club
						</div>
					)}
				</div>
			</div>
		</div>,
		{ width: WIDTH, height: HEIGHT, fonts },
	);
}

/** Kinds where the text itself is the content and leads the card. */
const QUOTE_KINDS = new Set(["Post", "Comment", "Review"]);
