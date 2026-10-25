import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { EditionChip } from "@/components/blocks/edition-chip";
import { editionDisplayLabel } from "@/lib/reading/edition-text";
import { cn } from "@/lib/utils";

/**
 * The name of the copy someone is reading ("Penguin · 2003 · Turkish", "Own copy ·
 * 320 pages"), as a link to the edition's page when it has one. A removed member
 * edition keeps its label but is plain text.
 */
export function EditionLabelLink({
	bookSlug,
	edition,
	totalPages,
	className,
}: {
	bookSlug: string;
	edition: ReadingItem["edition"];
	totalPages: number | null | undefined;
	className?: string;
}) {
	const label = editionDisplayLabel(edition, totalPages);
	if (edition?.key) {
		return (
			<EditionChip
				bookSlug={bookSlug}
				edition={{ key: edition.key, label }}
				variant="inline"
				className={className}
			/>
		);
	}
	return (
		<span className={cn("min-w-0 truncate", className)} title={label}>
			{label}
		</span>
	);
}
