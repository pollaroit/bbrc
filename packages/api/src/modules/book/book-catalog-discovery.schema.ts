import { BookSchema } from "@bbrc/schemas";
import zod from "zod";
import { BookListItemSchema } from "./book.schema";

export const BOOK_CATALOG_DISCOVERY_LIMIT = 4;

export const GetBookCatalogDiscoveryInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
});

export const BookCatalogDiscoverySectionSchema = zod.object({
	title: zod.string(),
	items: zod.array(BookListItemSchema).max(BOOK_CATALOG_DISCOVERY_LIMIT),
});

export const GetBookCatalogDiscoveryOutputSchema = zod.object({
	similar: BookCatalogDiscoverySectionSchema,
	byAuthor: BookCatalogDiscoverySectionSchema,
	byCountry: BookCatalogDiscoverySectionSchema.nullable(),
	byDecade: BookCatalogDiscoverySectionSchema,
	byPageSize: BookCatalogDiscoverySectionSchema,
});

export type GetBookCatalogDiscoveryInput = zod.infer<
	typeof GetBookCatalogDiscoveryInputSchema
>;
export type GetBookCatalogDiscoveryOutput = zod.infer<
	typeof GetBookCatalogDiscoveryOutputSchema
>;
