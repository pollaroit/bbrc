import { Button } from "@bbrc/ui/components/button";
import { ArchiveX } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

/** A member edition that was deleted: say so, and point at the book's editions. */
export function EditionRemoved({
	bookSlug,
	bookTitle,
}: {
	bookSlug: string;
	bookTitle: string;
}) {
	return (
		<div className="mx-auto flex max-w-xl flex-col items-center gap-4 border border-border border-dashed p-8 text-center">
			<ArchiveX className="size-8 text-muted-foreground" aria-hidden />
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-xl tracking-tight">
					This edition was removed
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Someone added this edition of {bookTitle} and it has since been taken
					down. Readings that used it keep their notes.
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-2">
				<Button
					nativeButton={false}
					render={<Link href={`/books/${bookSlug}/editions` as Route} />}
				>
					See the editions
				</Button>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href={`/books/${bookSlug}` as Route} />}
				>
					Back to the book
				</Button>
			</div>
		</div>
	);
}
