"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@bbrc/ui/components/dialog";
import { BookOpen, Maximize2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { BOOK_TONES, bookTone } from "@/lib/book-tones";
import { cn } from "@/lib/utils";

type BookCoverProps = {
	src: string | null;
	title: string;
	authors: string[];
	/** Picks the accent of the stand-in cover. */
	seed: string;
	className?: string;
	priority?: boolean;
};

type Status = "loading" | "ok" | "bad";

/**
 * A cover shown whole, never cropped: the frame takes the picture's own shape.
 * Open Library answers a dead cover id with a tiny "image not available" tile
 * (and a 200), so a picture that is small or lands wider than tall counts as
 * missing and the typographic stand-in takes its place.
 */
export function BookCover({
	src,
	title,
	authors,
	seed,
	className,
	priority = false,
}: BookCoverProps) {
	const [status, setStatus] = useState<Status>(src ? "loading" : "bad");
	const [ratio, setRatio] = useState<number | null>(null);

	const judge = useCallback((img: HTMLImageElement) => {
		const { naturalWidth: width, naturalHeight: height } = img;
		if (width < 80 || height <= width) {
			setStatus("bad");
			return;
		}
		setRatio(width / height);
		setStatus("ok");
	}, []);

	// The picture may have finished (or failed) before hydration: look once on mount.
	const imageRef = useCallback(
		(img: HTMLImageElement | null) => {
			if (!img?.complete) return;
			if (img.naturalWidth === 0) {
				setStatus("bad");
				return;
			}
			judge(img);
		},
		[judge],
	);

	if (status === "bad" || !src) {
		return (
			<div className={className}>
				<TypeCover title={title} authors={authors} seed={seed} />
			</div>
		);
	}

	return (
		<div className={className}>
			<Dialog>
				<DialogTrigger
					className="group/cover relative block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={`View the cover of ${title} full size`}
					disabled={status !== "ok"}
				>
					<span
						style={{ aspectRatio: ratio ?? 2 / 3 }}
						className={cn("relative block w-full", bookCoverFrameClassName)}
					>
						{/* biome-ignore lint/performance/noImgElement: Open Library covers are not optimised through Next */}
						<img
							ref={imageRef}
							src={src}
							alt={`Cover of ${title}`}
							loading={priority ? "eager" : "lazy"}
							fetchPriority={priority ? "high" : "auto"}
							onLoad={(event) => judge(event.currentTarget)}
							onError={() => setStatus("bad")}
							className={cn(
								"block size-full object-cover transition-opacity motion-reduce:transition-none",
								status === "ok" ? "opacity-100" : "opacity-0",
							)}
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-linear-to-r from-foreground/20 to-transparent"
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute right-2 bottom-2 grid size-7 place-items-center border border-border bg-background/90 text-foreground opacity-0 transition-opacity group-hover/cover:opacity-100 group-focus-visible/cover:opacity-100 motion-reduce:transition-none"
						>
							<Maximize2 className="size-3.5" />
						</span>
					</span>
				</DialogTrigger>
				<DialogContent
					showCloseButton={false}
					className="w-auto max-w-[96vw] gap-0 p-1.5 sm:max-w-[96vw]"
				>
					<DialogTitle className="sr-only">Cover of {title}</DialogTitle>
					{/* biome-ignore lint/performance/noImgElement: same picture as the page, already cached */}
					<img
						src={src}
						alt={`Cover of ${title}`}
						className="mx-auto block h-[min(88dvh,60rem)] w-auto max-w-[calc(96vw-0.75rem)] object-contain"
					/>
					<DialogClose
						render={
							<Button
								variant="outline"
								size="icon-sm"
								className="absolute top-3 right-3 bg-background/90"
							/>
						}
					>
						<X aria-hidden />
						<span className="sr-only">Close</span>
					</DialogClose>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** The stand-in: the title set large on the page's own surface, with a spine in the book's accent. */
export function TypeCover({
	title,
	authors,
	seed,
	className,
}: {
	title: string;
	authors: string[];
	seed: string;
	className?: string;
}) {
	const tone = BOOK_TONES[bookTone(seed)];
	const byline = authors.slice(0, 2).join(", ");

	return (
		<div
			role="img"
			aria-label={`${title}, no cover available`}
			className={cn(
				"relative flex aspect-2/3 w-full flex-col justify-between overflow-hidden bg-muted py-6 pr-5 pl-8 ring-1 ring-foreground/10",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn("absolute inset-y-0 left-0 w-2", tone.solid)}
			/>
			<BookOpen className={cn("size-5", tone.ink)} aria-hidden />
			<p className="wrap-break-word line-clamp-6 text-balance font-semibold text-2xl leading-tight">
				{title}
			</p>
			<p className="line-clamp-2 text-muted-foreground text-sm">{byline}</p>
		</div>
	);
}
