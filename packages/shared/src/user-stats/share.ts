/*
 * What a member's stats say when they are shared: a few numbers, the books as covers and
 * a line or two about taste. The picture and the copied text are both made from the same
 * facts, so they never disagree. Only what the member could see of their own page goes in.
 */

export type ShareTile = {
	id: string;
	label: string;
	value: string;
	unit: string | null;
};

export type StatsShareInput = {
	title: string;
	periodLabel: string;
	member: { name: string; username: string };
	scoreboard: readonly ShareTile[];
	books: readonly { slug: string; title: string; coverId: number | null }[];
	rank: { rank: number; of: number; topPercent: number } | null;
	topAuthor: string | null;
};

export type StatsShareFacts = {
	title: string;
	periodLabel: string;
	name: string;
	username: string;
	/** The headline numbers, at most four, in a fixed order. */
	numbers: { label: string; value: string }[];
	/** The books to show as covers, at most `limit`. */
	covers: { slug: string; title: string; coverId: number | null }[];
	/** A line each about taste: "Favourite subject: Fantasy". */
	highlights: string[];
	rankLine: string | null;
};

const NUMBER_ORDER = ["books", "pages", "time", "rating", "streak"] as const;

const fmt = (tile: ShareTile) =>
	tile.unit && ["h", "min"].includes(tile.unit)
		? `${tile.value} ${tile.unit}`
		: tile.value;

export function memberStatsShareFacts(
	input: StatsShareInput,
	options: { covers?: number } = {},
): StatsShareFacts {
	const byId = new Map(input.scoreboard.map((tile) => [tile.id, tile]));
	const numbers = NUMBER_ORDER.flatMap((id) => {
		const tile = byId.get(id);
		return tile ? [{ label: tile.label, value: fmt(tile) }] : [];
	}).slice(0, 4);

	const highlights: string[] = [];
	const subject = byId.get("subject");
	if (subject) highlights.push(`Favourite subject: ${subject.value}`);
	if (input.topAuthor) highlights.push(`Most read author: ${input.topAuthor}`);

	return {
		title: input.title,
		periodLabel: input.periodLabel,
		name: input.member.name,
		username: input.member.username,
		numbers,
		covers: input.books.slice(0, options.covers ?? 6),
		highlights,
		rankLine: input.rank
			? `#${input.rank.rank} of ${input.rank.of} readers in the club`
			: null,
	};
}

/** The same facts as plain text to paste anywhere. */
export function statsShareText(facts: StatsShareFacts, url: string): string {
	const lines = [
		facts.title,
		facts.numbers
			.map((number) => `${number.value} ${number.label.toLowerCase()}`)
			.join(" · "),
		...facts.highlights,
		...(facts.rankLine ? [facts.rankLine] : []),
		url,
	];
	return lines.filter((line) => line.trim().length > 0).join("\n");
}
