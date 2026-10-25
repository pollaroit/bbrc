import type { ShelfForBookListItemSchema } from "@bbrc/api/modules/shelf/shelf.schema";
import type { z } from "zod";
import {
	ShelfCatalogCard,
	shelvesGridClassName,
} from "@/components/blocks/shelf-catalog-card";

export type ShelfGridCardShelf = z.infer<typeof ShelfForBookListItemSchema>;

export { shelvesGridClassName };

type ShelfGridCardProps = {
	shelf: ShelfGridCardShelf;
	className?: string;
	showOwnerStatus?: boolean;
};

/** A shelf on a book page: the same card as the shelves catalog. */
export function ShelfGridCard({
	shelf,
	className,
	showOwnerStatus = false,
}: ShelfGridCardProps) {
	return (
		<ShelfCatalogCard
			shelf={shelf}
			showStatus={showOwnerStatus && shelf.isOwner}
			className={className}
			impressionSource="books"
		/>
	);
}
