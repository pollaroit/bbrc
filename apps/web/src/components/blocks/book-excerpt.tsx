"use client";

import { Button } from "@bbrc/ui/components/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { BookExcerptMarkdown } from "@/components/blocks/book-excerpt-markdown";
import { cn } from "@/lib/utils";

/** Past this many characters the excerpt starts folded. */
const FOLD_AT = 900;

/**
 * The book's excerpt set for reading: a comfortable line length, folded with
 * a fade when it is long, opened by a button that says what it does.
 */
export function BookExcerpt({ excerpt }: { excerpt: string }) {
	const long = excerpt.length > FOLD_AT;
	const [open, setOpen] = useState(!long);

	return (
		<div className="flex flex-col items-start gap-3">
			<div
				className={cn(
					"relative w-full",
					!open &&
						"max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]",
				)}
			>
				<BookExcerptMarkdown excerpt={excerpt} variant="reading" />
			</div>
			{long ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					aria-expanded={open}
					onClick={() => setOpen((value) => !value)}
					className="gap-1.5"
				>
					<ChevronDown
						className={cn(
							"size-3.5 transition-transform motion-reduce:transition-none",
							open && "rotate-180",
						)}
						aria-hidden
					/>
					{open ? "Show less" : "Read the rest"}
				</Button>
			) : null}
		</div>
	);
}
