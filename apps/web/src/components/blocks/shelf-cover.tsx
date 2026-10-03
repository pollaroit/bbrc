import { BookOpen } from "lucide-react";
import Image from "next/image";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type ShelfCoverProps = {
	coverIds: (number | null)[];
	className?: string;
	size?: "sm" | "md" | "lg";
};

const sizeClasses = {
	sm: "size-14",
	md: "size-24",
	lg: "size-32",
} as const;

function CoverCell({
	coverId,
	index,
}: {
	coverId: number | null;
	index: number;
}) {
	const src = bookCoverUrl(coverId);

	return (
		<div className="relative h-full min-h-0 w-full overflow-hidden bg-muted">
			{src ? (
				<Image
					src={src}
					alt=""
					fill
					className="object-cover"
					sizes="64px"
					priority={index === 0}
				/>
			) : null}
		</div>
	);
}

export function ShelfCover({
	coverIds,
	className,
	size = "md",
}: ShelfCoverProps) {
	const ids = coverIds.slice(0, 4);
	const dimension = sizeClasses[size];

	if (ids.length === 0) {
		return (
			<div
				className={cn(
					"flex shrink-0 items-center justify-center bg-muted text-muted-foreground ring-1 ring-foreground/10",
					dimension,
					className,
				)}
				aria-hidden
			>
				<BookOpen className="size-5" />
			</div>
		);
	}

	if (ids.length === 1) {
		const src = bookCoverUrl(ids[0]);
		return (
			<div
				className={cn(
					"relative shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
					dimension,
					className,
				)}
			>
				{src ? (
					<Image src={src} alt="" fill className="object-cover" sizes="128px" />
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground">
						<BookOpen className="size-5" />
					</div>
				)}
			</div>
		);
	}

	const mosaicFrame = cn(
		"shrink-0 overflow-hidden ring-1 ring-foreground/10",
		dimension,
		className,
	);

	if (ids.length === 2) {
		return (
			<div className={cn("flex", mosaicFrame)} aria-hidden>
				<div className="relative h-full min-h-0 flex-1">
					<CoverCell coverId={ids[0]} index={0} />
				</div>
				<div className="w-px shrink-0 bg-foreground/10" />
				<div className="relative h-full min-h-0 flex-1">
					<CoverCell coverId={ids[1]} index={1} />
				</div>
			</div>
		);
	}

	if (ids.length === 3) {
		return (
			<div
				className={cn(
					"grid grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))]",
					mosaicFrame,
				)}
				aria-hidden
			>
				<div className="relative h-full min-h-0">
					<CoverCell coverId={ids[0]} index={0} />
				</div>
				<div className="relative h-full min-h-0 border-foreground/10 border-l">
					<CoverCell coverId={ids[1]} index={1} />
				</div>
				<div className="relative col-span-2 h-full min-h-0 border-foreground/10 border-t">
					<CoverCell coverId={ids[2]} index={2} />
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"grid grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))]",
				mosaicFrame,
			)}
			aria-hidden
		>
			{ids.map((coverId, index) => (
				<div
					key={`${coverId ?? "none"}-${index}`}
					className={cn(
						"relative h-full min-h-0",
						index % 2 === 1 && "border-foreground/10 border-l",
						index >= 2 && "border-foreground/10 border-t",
					)}
				>
					<CoverCell coverId={coverId} index={index} />
				</div>
			))}
		</div>
	);
}

export function coverPreviewFromShelfBooks(
	books: { book: { coverId?: number | null } }[],
): (number | null)[] {
	return books.slice(0, 4).map((row) => row.book.coverId ?? null);
}

/** Prefer the longer of API preview ids or ids derived from shelf book rows. */
export function resolveShelfCoverIds(
	coverPreviewCoverIds: (number | null)[],
	books: { book: { coverId?: number | null } }[],
): (number | null)[] {
	const fromBooks = coverPreviewFromShelfBooks(books);
	if (fromBooks.length > coverPreviewCoverIds.length) {
		return fromBooks;
	}
	if (coverPreviewCoverIds.length > 0) {
		return coverPreviewCoverIds;
	}
	return fromBooks;
}
