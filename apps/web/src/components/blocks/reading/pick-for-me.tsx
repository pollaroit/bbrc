"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { BookOpen, Dices, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type PickBook = {
	slug: string;
	title: string;
	authors: string[];
	coverId?: number | null;
};

const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "Pick for me": the covers flick by, slowing down, and land on one book you can
 * start reading, or pick again. With reduced motion it simply lands.
 */
export function PickForMe({
	books,
	open,
	onOpenChange,
	onStart,
}: {
	books: PickBook[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStart: (book: PickBook) => void;
}) {
	const [index, setIndex] = useState(0);
	const [settled, setSettled] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const spin = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		const target = Math.floor(Math.random() * books.length);
		if (prefersReducedMotion() || books.length < 2) {
			setIndex(target);
			setSettled(true);
			return;
		}
		setSettled(false);
		// Count down the delay: quick at first, slower as it lands.
		const steps = 14 + Math.floor(Math.random() * 6);
		let current = Math.floor(Math.random() * books.length);
		let step = 0;
		const tick = () => {
			step += 1;
			current = step >= steps ? target : (current + 1) % books.length;
			setIndex(current);
			if (step >= steps) {
				setSettled(true);
				return;
			}
			timer.current = setTimeout(tick, 70 + step * step * 2.4);
		};
		timer.current = setTimeout(tick, 70);
	}, [books.length]);

	useEffect(() => {
		if (open) spin();
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [open, spin]);

	const book = books[index];
	const src = bookCoverUrl(book?.coverId, "M");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-5 sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Pick for me</DialogTitle>
					<DialogDescription>
						{settled ? "How about this one?" : "Choosing from your wishlist…"}
					</DialogDescription>
				</DialogHeader>
				{book ? (
					<div
						className="flex flex-col items-center gap-3 text-center"
						aria-live="polite"
					>
						<div
							className={cn(
								"relative aspect-2/3 w-32 overflow-hidden bg-muted ring-1 ring-foreground/10 transition-transform duration-200 motion-reduce:transition-none",
								settled ? "scale-100" : "scale-95",
							)}
						>
							{src ? (
								<Image
									src={src}
									alt=""
									fill
									className="object-cover"
									sizes="128px"
								/>
							) : (
								<BookOpen
									className="absolute inset-0 m-auto size-8 text-muted-foreground"
									aria-hidden
								/>
							)}
						</div>
						<div className="min-w-0">
							<p className="font-semibold leading-snug">{book.title}</p>
							<p className="text-muted-foreground text-sm">
								{formatBookAuthors(book.authors)}
							</p>
						</div>
					</div>
				) : null}
				<DialogFooter className="gap-2 sm:justify-between">
					<Button
						type="button"
						variant="outline"
						disabled={!settled}
						onClick={spin}
					>
						<Dices data-icon="inline-start" aria-hidden />
						Pick again
					</Button>
					<Button
						type="button"
						disabled={!settled || !book}
						onClick={() => book && onStart(book)}
					>
						<Play data-icon="inline-start" aria-hidden />
						Start reading
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
