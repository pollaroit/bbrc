import { BookOpen } from "lucide-react";
import Link from "next/link";
import { editionHref } from "@/lib/book-edition/edition-href";
import { cn } from "@/lib/utils";

type EditionChipProps = {
	bookSlug: string;
	/** What to link to; nothing is shown when there is no edition. */
	edition: { key: string; label: string | null } | null | undefined;
	/**
	 * `chip`: a small bordered tag with a book icon ("Read the Penguin · 2003 edition").
	 * `inline`: plain text that underlines on hover, for use inside a sentence or row.
	 */
	variant?: "chip" | "inline";
	/** Replaces "Read the {label} edition" in the chip. */
	prefix?: string;
	className?: string;
};

/** A link to an edition's page that never makes its row wider than its box. */
export function EditionChip({
	bookSlug,
	edition,
	variant = "chip",
	prefix,
	className,
}: EditionChipProps) {
	if (!edition) return null;
	const label = edition.label?.trim() || "this edition";
	const text =
		variant === "chip"
			? `${prefix ?? "Read the"} ${label}${edition.label ? " edition" : ""}`
			: label;

	if (variant === "inline") {
		return (
			<Link
				href={editionHref(bookSlug, edition.key)}
				title={label}
				className={cn(
					"relative z-2 min-w-0 truncate underline-offset-4 hover:text-foreground hover:underline",
					className,
				)}
			>
				{label}
			</Link>
		);
	}

	return (
		<Link
			href={editionHref(bookSlug, edition.key)}
			title={text}
			className={cn(
				"relative z-2 inline-flex min-w-0 max-w-full items-center gap-1 border border-border px-1.5 py-0.5 text-2xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
				className,
			)}
		>
			<BookOpen className="size-3 shrink-0" aria-hidden />
			<span className="min-w-0 truncate">{text}</span>
		</Link>
	);
}
