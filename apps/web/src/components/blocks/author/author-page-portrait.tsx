/** biome-ignore-all lint/performance/noImgElement: author photos are copies in our own storage or Commons files, not optimised assets */
import { cn } from "@/lib/utils";

type AuthorPagePortraitProps = {
	name: string;
	photoUrl: string | null;
	/** `hero` is the big 3:4 frame; `chip` a small square. */
	size?: "hero" | "chip";
	className?: string;
};

/** A photo when we have one, else the first letter of the name on a quiet tile. */
export function AuthorPagePortrait({
	name,
	photoUrl,
	size = "hero",
	className,
}: AuthorPagePortraitProps) {
	const frame = cn(
		"relative shrink-0 overflow-hidden border border-border bg-muted",
		size === "hero" ? "aspect-[3/4] w-28 sm:w-40" : "size-12",
		className,
	);

	if (photoUrl) {
		return (
			<div className={frame}>
				<img
					src={photoUrl}
					alt={`Portrait of ${name}`}
					className="size-full object-cover"
					loading={size === "hero" ? "eager" : "lazy"}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(frame, "grid place-items-center text-muted-foreground")}
			role="img"
			aria-label={`${name} (no photo yet)`}
		>
			<span
				className={cn(
					"font-semibold leading-none",
					size === "hero" ? "text-3xl sm:text-5xl" : "text-lg",
				)}
				aria-hidden
			>
				{name.trim().charAt(0).toUpperCase()}
			</span>
		</div>
	);
}
