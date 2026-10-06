type StarFill = "full" | "half" | "empty";

function starFillAt(starIndex: number, rating: number): StarFill {
	const value = rating - (starIndex - 1);
	if (value >= 1) {
		return "full";
	}
	if (value >= 0.5) {
		return "half";
	}
	return "empty";
}

const STAR_PATH =
	"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

const STAR_SIZE = 52;

function StarSvg({ filled }: { filled: boolean }) {
	const fillColor = filled ? "#fafafa" : "transparent";
	const strokeColor = filled ? "#fafafa" : "rgba(250, 250, 250, 0.35)";

	return (
		<svg
			viewBox="0 0 24 24"
			width={STAR_SIZE}
			height={STAR_SIZE}
			aria-hidden
			style={{ display: "flex" }}
		>
			<path
				d={STAR_PATH}
				fill={fillColor}
				stroke={strokeColor}
				strokeWidth={1.5}
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function StoryStar({ fill }: { fill: StarFill }) {
	if (fill === "half") {
		return (
			<div
				style={{
					display: "flex",
					position: "relative",
					width: STAR_SIZE,
					height: STAR_SIZE,
				}}
			>
				<div style={{ display: "flex", position: "absolute", inset: 0 }}>
					<StarSvg filled={false} />
				</div>
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						width: STAR_SIZE / 2,
						height: STAR_SIZE,
						overflow: "hidden",
					}}
				>
					<StarSvg filled />
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				width: STAR_SIZE,
				height: STAR_SIZE,
			}}
		>
			<StarSvg filled={fill === "full"} />
		</div>
	);
}

type StoryStarRowProps = {
	rating: number;
};

export function StoryStarRow({ rating }: StoryStarRowProps) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
			{[1, 2, 3, 4, 5].map((index) => (
				<StoryStar key={index} fill={starFillAt(index, rating)} />
			))}
		</div>
	);
}
