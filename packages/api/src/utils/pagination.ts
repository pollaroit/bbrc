import {
	CursorPaginationInputSchema,
	OffsetPaginationInputSchema,
	type TCursorPaginationInputSchema,
	type TCursorPaginationMetadataSchema,
	type TOffsetPaginationInputSchema,
	type TOffsetPaginationMetadataSchema,
} from "@bbrc/schemas/listing/pagination";

/** Extra row fetched to detect a next page (cursor pagination). */
const CURSOR_OVERFETCH = 1;

export type OffsetPaginatedResult<TItem> = {
	items: TItem[];
	metadata: TOffsetPaginationMetadataSchema;
};

export type CursorPaginatedResult<TItem> = {
	items: TItem[];
	metadata: TCursorPaginationMetadataSchema;
};

export interface OffsetPaginationContext {
	readonly page: number;
	readonly limit: number;
	readonly skip: number;
	/** Prisma `findMany` spread: `{ take, skip }`. */
	use(): { take: number; skip: number };
	getMeta(total: number): TOffsetPaginationMetadataSchema;
	paginate<TItem>(
		items: TItem[],
		total: number,
	): { items: TItem[]; metadata: TOffsetPaginationMetadataSchema };
}

export type CursorCodec<TItem, TCursor extends Record<string, unknown>> = {
	decode: (cursor: string) => TCursor;
	encode: (item: TItem) => string;
};

export interface CursorPaginationContext<
	TItem,
	TCursor extends Record<string, unknown>,
> {
	readonly limit: number;
	readonly cursor: string | undefined;
	readonly hasPreviousPage: boolean;
	/** Prisma `findMany` spread. Uses `take: limit + 1` for next-page detection. */
	use(): { take: number; cursor?: TCursor; skip?: number };
	getMeta(items: TItem[]): TCursorPaginationMetadataSchema;
	paginate(items: TItem[]): {
		items: TItem[];
		metadata: TCursorPaginationMetadataSchema;
	};
}

function buildOffsetMeta(
	page: number,
	limit: number,
	total: number,
): TOffsetPaginationMetadataSchema {
	const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
	const hasNextPage = page < totalPages;

	return {
		page,
		limit,
		total,
		totalPages,
		hasNextPage,
		nextPage: hasNextPage ? page + 1 : null,
		prevPage: page > 1 ? page - 1 : null,
	};
}

function createOffsetContext(
	input: TOffsetPaginationInputSchema,
): OffsetPaginationContext {
	const { page, limit } = input;
	const skip = (page - 1) * limit;

	return {
		page,
		limit,
		skip,
		use() {
			return { take: limit, skip };
		},
		getMeta(total) {
			return buildOffsetMeta(page, limit, total);
		},
		paginate(items, total) {
			return {
				items,
				metadata: buildOffsetMeta(page, limit, total),
			};
		},
	};
}

function createCursorContext<TItem, TCursor extends Record<string, unknown>>(
	input: TCursorPaginationInputSchema,
	codec: CursorCodec<TItem, TCursor>,
): CursorPaginationContext<TItem, TCursor> {
	const { limit, cursor } = input;
	const hasPreviousPage = cursor !== undefined;

	return {
		limit,
		cursor,
		hasPreviousPage,
		use() {
			const take = limit + CURSOR_OVERFETCH;

			if (!cursor) {
				return { take };
			}

			return {
				take,
				cursor: codec.decode(cursor),
				skip: 1,
			};
		},
		getMeta(items) {
			const hasNextPage = items.length > limit;
			const pageItems = hasNextPage ? items.slice(0, limit) : items;
			const lastItem = pageItems.at(-1);

			return {
				limit,
				hasNextPage,
				hasPreviousPage,
				nextCursor:
					hasNextPage && lastItem !== undefined ? codec.encode(lastItem) : null,
			};
		},
		paginate(items) {
			const metadata = this.getMeta(items);
			const pageItems = items.length > limit ? items.slice(0, limit) : items;

			return {
				items: pageItems,
				metadata,
			};
		},
	};
}

export const definePagination = {
	offset(input: TOffsetPaginationInputSchema): OffsetPaginationContext {
		return createOffsetContext(OffsetPaginationInputSchema.parse(input));
	},

	cursor<TItem, TCursor extends Record<string, unknown>>(
		input: TCursorPaginationInputSchema,
		codec: CursorCodec<TItem, TCursor>,
	): CursorPaginationContext<TItem, TCursor> {
		return createCursorContext(CursorPaginationInputSchema.parse(input), codec);
	},
} as const;
