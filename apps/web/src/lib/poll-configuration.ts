import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { getBookCountryName } from "@bbrc/shared";
import { formatPollPageRange } from "@/lib/poll-page-range";

export type SittingPollConfiguration = NonNullable<
	GetSittingBySlugOutput["poll"]
>;

export function formatPollBallotChoices(
	minChoices: number,
	maxChoices: number,
): string {
	if (minChoices === maxChoices) {
		return minChoices === 1
			? "1 book per ballot"
			: `${minChoices} books per ballot`;
	}

	return `${minChoices} to ${maxChoices} books per ballot`;
}

function formatIntRange(
	min: number | null | undefined,
	max: number | null | undefined,
	emptyLabel: string,
): string {
	if (min == null && max == null) {
		return emptyLabel;
	}

	if (min != null && max == null) {
		return `${min} or later`;
	}

	if (min == null && max != null) {
		return `${max} or earlier`;
	}

	return `${min}–${max}`;
}

function formatAuthorSlugLabel(slug: string): string {
	return slug.replaceAll("_", " ");
}

function formatCountryFilter(codes: string[]): string {
	if (codes.length === 0) {
		return "Any origin";
	}

	return codes.map((code) => getBookCountryName(code) ?? code).join(", ");
}

function formatAuthorFilter(slugs: string[]): string {
	if (slugs.length === 0) {
		return "Any author";
	}

	return slugs.map(formatAuthorSlugLabel).join(", ");
}

export function getPollConfigurationRows(poll: SittingPollConfiguration) {
	const maxChoices = poll.maxChoices ?? poll.take;
	const pageRange = formatPollPageRange(poll.minPages, poll.maxPages);

	return [
		{
			label: "Page count",
			value:
				pageRange === "No page range"
					? "Any length"
					: pageRange.replace(" - ", "–"),
		},
		{
			label: "First published",
			value: formatIntRange(
				poll.minPublishedIn,
				poll.maxPublishedIn,
				"Any year",
			),
		},
		{
			label: "Open Library rating",
			value:
				poll.minOpenLibraryRating == null
					? "Any rating"
					: `At least ${poll.minOpenLibraryRating}`,
		},
		{
			label: "Member reads",
			value: formatIntRange(poll.minReads, poll.maxReads, "Any count"),
		},
		{
			label: "Literary origin",
			value: formatCountryFilter(poll.countries),
		},
		{
			label: "Authors",
			value: formatAuthorFilter(poll.authors),
		},
		{
			label: "Books on ballot",
			value:
				poll.options.length === poll.take
					? String(poll.take)
					: `${poll.options.length} (drawn for ${poll.take})`,
		},
		{
			label: "Choices per voter",
			value: formatPollBallotChoices(poll.minChoices, maxChoices),
		},
	] as const;
}
