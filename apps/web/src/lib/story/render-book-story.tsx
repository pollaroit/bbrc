import { ImageResponse } from "next/og";
import { getOgFonts } from "@/lib/seo/og/fonts";
import { SITE_SHORT_NAME } from "@/lib/seo/site";
import type { BookStoryContent } from "./book-story-content";
import { BOOK_STORY_HEIGHT, BOOK_STORY_WIDTH } from "./constants";
import { StoryStarRow } from "./story-star-row";

function titleFontSize(title: string): number {
	if (title.length > 72) {
		return 40;
	}
	if (title.length > 48) {
		return 46;
	}
	if (title.length > 32) {
		return 52;
	}
	return 58;
}

export async function renderBookStoryImage(
	content: BookStoryContent,
): Promise<ImageResponse> {
	const fonts = getOgFonts();
	const titleSize = titleFontSize(content.title);
	const coverWidth = 520;
	const coverHeight = Math.round(coverWidth * 1.5);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "96px 64px 80px",
				background:
					"linear-gradient(168deg, #0a0a0a 0%, #121212 38%, #0d0d0d 72%, #050505 100%)",
				color: "#fafafa",
				fontFamily: "Geist Mono",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					flex: 1,
					justifyContent: "center",
					gap: 40,
					width: "100%",
					maxWidth: 920,
				}}
			>
				<div
					style={{
						display: "flex",
						width: coverWidth,
						height: coverHeight,
						background: "rgba(250, 250, 250, 0.06)",
						boxShadow: "0 24px 64px rgba(0, 0, 0, 0.45)",
						border: "1px solid rgba(250, 250, 250, 0.12)",
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
								objectFit: "cover",
								width: coverWidth,
								height: coverHeight,
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								fontSize: 24,
								color: "rgba(250, 250, 250, 0.45)",
							}}
						>
							No cover
						</div>
					)}
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 16,
						textAlign: "center",
						width: "100%",
					}}
				>
					<div
						style={{
							display: "flex",
							width: "100%",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								textAlign: "center",
								fontSize: titleSize,
								fontWeight: 600,
								lineHeight: 1.15,
								letterSpacing: "-0.02em",
								maxWidth: 920,
								maxHeight: titleSize * 1.15 * 3,
								overflow: "hidden",
							}}
						>
							{content.title}
						</div>
					</div>
					<div
						style={{
							display: "flex",
							width: "100%",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								textAlign: "center",
								fontSize: 28,
								lineHeight: 1.35,
								color: "rgba(250, 250, 250, 0.55)",
								maxWidth: 920,
								maxHeight: 80,
								overflow: "hidden",
							}}
						>
							{content.authorsLine}
						</div>
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 28,
					width: "100%",
				}}
			>
				{content.myRating != null ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 12,
						}}
					>
						<StoryStarRow rating={content.myRating} />
					</div>
				) : null}
				<div
					style={{
						display: "flex",
						fontSize: 22,
						fontWeight: 600,
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						color: "rgba(250, 250, 250, 0.42)",
					}}
				>
					{SITE_SHORT_NAME}
				</div>
			</div>
		</div>,
		{
			width: BOOK_STORY_WIDTH,
			height: BOOK_STORY_HEIGHT,
			fonts,
		},
	);
}
