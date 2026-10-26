import { AuthorPhoto } from "./author-photo";

type AuthorPagePortraitProps = {
	name: string;
	photoUrl: string | null;
	size?: "hero" | "chip";
	className?: string;
};

/** Kept for callers that still pass `hero` / `chip`; both are square now. */
export function AuthorPagePortrait({
	name,
	photoUrl,
	size = "hero",
	className,
}: AuthorPagePortraitProps) {
	return (
		<AuthorPhoto
			name={name}
			photoUrl={photoUrl}
			size={size === "hero" ? "hero" : "md"}
			className={className}
		/>
	);
}
