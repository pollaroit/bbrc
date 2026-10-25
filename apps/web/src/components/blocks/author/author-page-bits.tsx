import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

/** A 2:3 cover tile, with a quiet "No cover" fallback so a grid never jumps. */
export function AuthorPageCover({
	coverId,
	title,
	className,
	sizes = "96px",
}: {
	coverId: number | null;
	title: string;
	className?: string;
	sizes?: string;
}) {
	const src = bookCoverUrl(coverId);

	return (
		<div
			className={cn(
				"relative aspect-[2/3] w-full",
				bookCoverFrameClassName,
				className,
			)}
		>
			{src ? (
				<Image
					src={src}
					alt={`Cover of ${title}`}
					fill
					className="object-cover"
					sizes={sizes}
				/>
			) : (
				<div className="flex size-full items-center justify-center px-1 text-center text-2xs text-muted-foreground leading-tight">
					No cover
				</div>
			)}
		</div>
	);
}

/** A titled block used by every tab. */
export function AuthorPageSection({
	title,
	description,
	href,
	hrefLabel,
	children,
	className,
}: {
	title: string;
	description?: string;
	href?: Route;
	hrefLabel?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2 className="font-semibold text-sm tracking-tight">{title}</h2>
					{description ? (
						<p className="text-muted-foreground text-xs">{description}</p>
					) : null}
				</div>
				{href ? (
					<Link
						href={href}
						className="shrink-0 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
					>
						{hrefLabel ?? "See all"}
					</Link>
				) : null}
			</div>
			{children}
		</section>
	);
}

export function AuthorPageEmpty({ children }: { children: React.ReactNode }) {
	return (
		<p className="border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
			{children}
		</p>
	);
}
