import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsIsoDate,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs";

export const sortDirectionParser = parseAsStringLiteral([
	"asc",
	"desc",
] as const);

export const searchParser = parseAsString;

export const rangeMinParser = parseAsIsoDate;

export const rangeMaxParser = parseAsIsoDate;

export function createSortByParser<
	const T extends readonly [string, ...string[]],
>(fields: T) {
	return parseAsStringLiteral(fields);
}

export function createRangeByParser<
	const T extends readonly [string, ...string[]],
>(fields: T) {
	return parseAsStringLiteral(fields);
}

export function createStringLiteralArrayParser<
	const T extends readonly [string, ...string[]],
>(values: T) {
	return parseAsArrayOf(parseAsStringLiteral(values));
}

export const booleanFilterParser = parseAsBoolean;
