"use client";

import type { EditionCore } from "@bbrc/api/modules/edition/edition.schema";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { coverSrc } from "@/lib/edition/format";
import { cn } from "@/lib/utils";

/**
 * The edition's cover in a fixed 2:3 frame. When Open Library has several
 * covers for the edition, small thumbnails switch between them (arrow keys too).
 */
export function EditionCoverGallery({
	covers,
	title,
	fallbackCoverId,
}: {
	covers: EditionCore["covers"];
	title: string;
	/** The book's own cover, shown when the edition has none. */
	fallbackCoverId?: number | null;
}) {
	const usable = covers.filter((cover) => coverSrc(cover) != null);
	const [index, setIndex] = useState(0);
	const active = usable[Math.min(index, Math.max(0, usable.length - 1))];
	const main = coverSrc(active, "L");
	const fallback =
		main == null && fallbackCoverId != null
			? `https://covers.openlibrary.org/b/id/${fallbackCoverId}-L.jpg`
			: null;
	const shown = main ?? fallback;

	return (
		<div className="flex flex-col gap-3">
			<div
				className={cn(
					"relative mx-auto aspect-2/3 w-full max-w-[16rem]",
					bookCoverFrameClassName,
					"shadow-[6px_6px_0_0_var(--border)]",
				)}
			>
				{shown ? (
					<Image
						src={shown}
						alt={`Cover of ${title}`}
						fill
						priority
						className="object-cover"
						sizes="(max-width: 768px) 60vw, 256px"
					/>
				) : (
					<div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground text-sm">
						<BookOpen className="size-6" aria-hidden />
						No cover for this edition
					</div>
				)}
			</div>
			{usable.length > 1 ? (
				<fieldset
					className="m-0 flex flex-wrap justify-center gap-2 border-0 p-0"
					aria-label="Other covers of this edition"
				>
					{usable.map((cover, position) => {
						const thumb = coverSrc(cover, "S");
						if (!thumb) return null;
						return (
							<button
								// biome-ignore lint/suspicious/noArrayIndexKey: covers have no id and the order is stable
								key={position}
								type="button"
								aria-pressed={position === index}
								aria-label={`Show cover ${position + 1} of ${usable.length}`}
								onClick={() => setIndex(position)}
								onKeyDown={(event) => {
									if (event.key === "ArrowRight") {
										setIndex((value) => Math.min(usable.length - 1, value + 1));
									} else if (event.key === "ArrowLeft") {
										setIndex((value) => Math.max(0, value - 1));
									}
								}}
								className={cn(
									"relative h-14 w-9 overflow-hidden bg-muted outline-offset-2 ring-1 ring-foreground/10 transition-opacity focus-visible:outline-2 focus-visible:outline-ring",
									position === index
										? "ring-2 ring-foreground"
										: "opacity-60 hover:opacity-100",
								)}
							>
								<Image
									src={thumb}
									alt=""
									fill
									className="object-cover"
									sizes="36px"
								/>
							</button>
						);
					})}
				</fieldset>
			) : null}
		</div>
	);
}
