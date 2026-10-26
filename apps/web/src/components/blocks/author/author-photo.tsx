/** biome-ignore-all lint/performance/noImgElement: author photos are copies in our own storage or Commons files, not optimised assets */
import { cn } from "@/lib/utils";

export type AuthorPhotoSize =
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "hero"
	| "fill";

type AuthorPhotoProps = {
	name: string;
	photoUrl?: string | null;
	size?: AuthorPhotoSize;
	className?: string;
};

/** Every size is a square: author photos are portraits, never book-cover shaped. */
const FRAME: Record<AuthorPhotoSize, string> = {
	xs: "size-6",
	sm: "size-9",
	md: "size-12",
	lg: "size-16",
	xl: "size-24",
	hero: "size-28 sm:size-44",
	/** Fills the width of the parent; the height follows from the 1:1 ratio. */
	fill: "w-full",
};

const INITIAL: Record<AuthorPhotoSize, string> = {
	xs: "text-2xs",
	sm: "text-sm",
	md: "text-lg",
	lg: "text-2xl",
	xl: "text-4xl",
	hero: "text-4xl sm:text-6xl",
	fill: "text-3xl",
};

/**
 * A photo when we have one, else the first letter of the name on a quiet tile. Always 1:1.
 * Pass `className` with a width (`w-full`) to let the square fill its container.
 */
export function AuthorPhoto({
	name,
	photoUrl,
	size = "md",
	className,
}: AuthorPhotoProps) {
	const frame = cn(
		"relative aspect-square shrink-0 overflow-hidden border border-border bg-muted",
		FRAME[size],
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
				className={cn("font-semibold leading-none", INITIAL[size])}
				aria-hidden
			>
				{name.trim().charAt(0).toUpperCase()}
			</span>
		</div>
	);
}
