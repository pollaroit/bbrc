import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import {
	authorNameToSlug,
	ballotAccess,
	bookCountryCodeSchema,
	canSeeResults,
	getBookCountryName,
	getZonedParts,
	isTighterOrEqualBallotVisibility,
	normalizeChoiceLimits,
	POST_POLL_LIMITS,
	POST_POLL_VOTE_MILESTONES,
	type PostPollOptionKind,
	pollEnded,
	refDedupeKey,
	resolveClubTimeZone,
	searchPollCountries,
	tallyBallots,
	textDedupeKey,
	validateBallot,
	validatePollSetup,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { dispatchNotification } from "../notification/notification.service";
import {
	assertContentNotVisible,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	CreatePollInput,
	PollOption,
	PollStats,
	PostPollView,
} from "./post-poll.schema";

type Db = Database | DatabaseTransaction;

type PollViewer = { userId: string | null; isAdmin: boolean };

const memberSelect = {
	select: { username: true, name: true, image: true },
} as const;

const pollSelect = {
	id: true,
	type: true,
	minChoices: true,
	maxChoices: true,
	optionKind: true,
	allowUserOptions: true,
	maxOptionsPerUser: true,
	maxOptionsTotal: true,
	resultsVisibility: true,
	ballotVisibility: true,
	allowVoteChange: true,
	deadline: true,
	closedAt: true,
	endedNotifiedAt: true,
	post: { select: { id: true, slug: true, authorId: true } },
	options: {
		orderBy: { position: "asc" },
		select: {
			id: true,
			kind: true,
			label: true,
			position: true,
			userAdded: true,
			addedById: true,
			createdAt: true,
			addedBy: memberSelect,
			book: {
				select: { slug: true, title: true, authors: true, coverId: true },
			},
			series: { select: { slug: true, title: true } },
			user: {
				select: { username: true, name: true, image: true, isHidden: true },
			},
			refKey: true,
		},
	},
	votes: {
		orderBy: { createdAt: "asc" },
		select: {
			optionId: true,
			userId: true,
			rank: true,
			createdAt: true,
			updatedAt: true,
			user: memberSelect,
		},
	},
} as const satisfies Prisma.PostPollSelect;

type PollRow = Prisma.PostPollGetPayload<{ select: typeof pollSelect }>;

export function pollViewer(session: Session | null): PollViewer {
	const viewer = viewerFromSession(session);
	return { userId: viewer?.userId ?? null, isAdmin: viewer?.isAdmin ?? false };
}

function toMember(user: {
	username: string;
	name: string;
	image: string | null;
}) {
	return { username: user.username, name: user.name, image: user.image };
}

// ── Building the view ──────────────────────────────────────────────────────

function optionTarget(option: PollRow["options"][number]) {
	return {
		slug: option.book?.slug ?? option.series?.slug ?? null,
		title: option.book?.title ?? option.series?.title ?? null,
		authors: option.book?.authors ?? [],
		coverId: option.book?.coverId ?? null,
		username:
			option.user && !option.user.isHidden ? option.user.username : null,
		name: option.user && !option.user.isHidden ? option.user.name : null,
		image: option.user && !option.user.isHidden ? option.user.image : null,
		code: option.kind === "country" ? option.refKey : null,
	};
}

export function buildPollView(
	row: PollRow,
	viewer: PollViewer,
	now: Date = new Date(),
): PostPollView {
	const isOwner = viewer.userId != null && viewer.userId === row.post.authorId;
	const ended = pollEnded(row, now);
	const myVotes = row.votes
		.filter((vote) => vote.userId === viewer.userId)
		.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
	const hasVoted = myVotes.length > 0;

	const resultsVisible = canSeeResults(row.resultsVisibility, {
		isOwner,
		isAdmin: viewer.isAdmin,
		hasVoted,
		ended,
	});
	const access = ballotAccess(row.ballotVisibility, {
		isOwner,
		isAdmin: viewer.isAdmin,
		hasVoted,
		resultsVisible,
	});

	const config = {
		type: row.type,
		minChoices: row.minChoices,
		maxChoices: row.maxChoices,
	};
	const tally = tallyBallots(
		config,
		row.options.map((option) => option.id),
		row.votes,
	);
	const tallyByOption = new Map(tally.options.map((t) => [t.optionId, t]));
	const hasVotes = row.votes.length > 0;

	const userAddedTotal = row.options.filter((o) => o.userAdded).length;
	const userAddedByMe = row.options.filter(
		(o) => o.userAdded && o.addedById === viewer.userId,
	).length;
	const ownLeft =
		row.maxOptionsPerUser == null
			? null
			: row.maxOptionsPerUser - userAddedByMe;
	const totalLeft =
		row.maxOptionsTotal == null ? null : row.maxOptionsTotal - userAddedTotal;
	const roomForMore = row.options.length < POST_POLL_LIMITS.maxOptions;

	let canAddOption = false;
	let ownOptionsLeft: number | null = null;
	if (viewer.userId && !ended && roomForMore) {
		if (isOwner) {
			canAddOption = true;
		} else if (row.allowUserOptions) {
			ownOptionsLeft = Math.min(
				ownLeft ?? Number.POSITIVE_INFINITY,
				totalLeft ?? Number.POSITIVE_INFINITY,
			);
			if (!Number.isFinite(ownOptionsLeft)) ownOptionsLeft = null;
			canAddOption = ownOptionsLeft == null || ownOptionsLeft > 0;
		}
	}

	let blockedReason: string | null = null;
	if (!viewer.userId) blockedReason = "Sign in to vote.";
	else if (ended) blockedReason = "This poll has ended.";
	else if (hasVoted && !row.allowVoteChange)
		blockedReason = "Votes cannot be changed on this poll.";

	const votersByOption = new Map<string, PollOption["voters"]>();
	if (access === "ballots") {
		for (const vote of row.votes) {
			const list = votersByOption.get(vote.optionId) ?? [];
			if (list.length < POST_POLL_LIMITS.maxVotersListed) {
				list.push({ ...toMember(vote.user), rank: vote.rank });
			}
			votersByOption.set(vote.optionId, list);
		}
	}

	const options: PollOption[] = row.options.map((option) => {
		const optionTally = tallyByOption.get(option.id);
		const adder = option.userAdded && option.addedById === viewer.userId;
		const othersVoted = row.votes.some(
			(vote) => vote.optionId === option.id && vote.userId !== option.addedById,
		);
		const canRemove =
			!ended &&
			viewer.userId != null &&
			((isOwner && (option.userAdded || !hasVotes)) ||
				(adder && !othersVoted) ||
				(viewer.isAdmin && option.userAdded));

		return {
			id: option.id,
			kind: option.kind,
			label: option.label,
			position: option.position,
			userAdded: option.userAdded,
			addedBy: option.addedBy ? toMember(option.addedBy) : null,
			target: optionTarget(option),
			canRemove,
			result:
				resultsVisible && optionTally
					? {
							voters: optionTally.voters,
							share: optionTally.share,
							points: optionTally.points,
							firstChoices: optionTally.firstChoices,
							rankSum: optionTally.rankSum,
						}
					: null,
			voters:
				access === "ballots" ? (votersByOption.get(option.id) ?? []) : null,
		};
	});

	const turnout =
		access === "none"
			? null
			: [
					...new Map(
						row.votes.map(
							(vote) => [vote.userId, toMember(vote.user)] as const,
						),
					).values(),
				];

	return {
		id: row.id,
		type: row.type,
		minChoices: row.minChoices,
		maxChoices: row.maxChoices,
		optionKind: row.optionKind,
		allowUserOptions: row.allowUserOptions,
		maxOptionsPerUser: row.maxOptionsPerUser,
		maxOptionsTotal: row.maxOptionsTotal,
		resultsVisibility: row.resultsVisibility,
		ballotVisibility: row.ballotVisibility,
		allowVoteChange: row.allowVoteChange,
		deadline: row.deadline,
		closedAt: row.closedAt,
		ended,
		resultsVisible,
		totalVoters: resultsVisible ? tally.totalVoters : null,
		ballotAccess: access,
		turnout,
		viewer: {
			isOwner,
			hasVoted,
			myBallot: myVotes.map((vote) => vote.optionId),
			canVote: blockedReason == null,
			blockedReason,
			canAddOption,
			ownOptionsLeft,
			hasVotes: isOwner ? hasVotes : false,
		},
		options,
	};
}

/** The polls of many posts at once, keyed by post id. Also settles polls that just ended. */
export async function loadPollViews(
	db: Database,
	postIds: string[],
	viewer: PollViewer,
): Promise<Map<string, PostPollView>> {
	if (postIds.length === 0) {
		return new Map();
	}

	const rows = await db.postPoll.findMany({
		where: { postId: { in: postIds } },
		select: pollSelect,
	});

	const now = new Date();
	void settleEndedPolls(db, rows, now);

	return new Map(
		rows.map((row) => [row.post.id, buildPollView(row, viewer, now)]),
	);
}

async function loadPollRow(db: Db, postSlug: string): Promise<PollRow> {
	const row = await db.postPoll.findFirst({
		where: { post: { slug: postSlug } },
		select: pollSelect,
	});
	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Poll not found" });
	}
	return row;
}

export async function getPollView(
	db: Database,
	postSlug: string,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadPollRow(db, postSlug);
	const author = await db.user.findUnique({
		where: { id: row.post.authorId },
		select: { id: true, isHidden: true },
	});
	assertContentNotVisible(
		author ?? { id: row.post.authorId, isHidden: true },
		viewerFromSession(session),
		"Poll not found",
	);
	const now = new Date();
	void settleEndedPolls(db, [row], now);
	return buildPollView(row, pollViewer(session), now);
}

// ── Ending ─────────────────────────────────────────────────────────────────

function authorName(user: { name: string; username: string } | null) {
	return user?.name?.trim() || user?.username || "Someone";
}

/** Sends the "poll ended" notification once, the first time anyone notices it ended. */
async function settleEndedPolls(
	db: Database,
	rows: Pick<
		PollRow,
		"id" | "deadline" | "closedAt" | "endedNotifiedAt" | "post" | "votes"
	>[],
	now: Date,
) {
	for (const row of rows) {
		if (row.endedNotifiedAt != null || !pollEnded(row, now)) continue;
		try {
			const claimed = await db.postPoll.updateMany({
				where: { id: row.id, endedNotifiedAt: null },
				data: { endedNotifiedAt: now },
			});
			if (claimed.count === 0) continue;
			await notifyPollEnded(db, row);
		} catch (error) {
			console.error("poll ended notification failed", error);
		}
	}
}

async function notifyPollEnded(
	db: Database,
	row: Pick<PollRow, "post" | "votes">,
) {
	const voterIds = [...new Set(row.votes.map((vote) => vote.userId))];
	await dispatchNotification(db, {
		kind: "poll_ended",
		recipientUserIds: [row.post.authorId, ...voterIds],
		title: "A poll has ended",
		body: "Voting is closed. Take a look at how it turned out.",
		href: `/posts/${row.post.slug}`,
	});
}

/** For the daily sweep: ends notifications for polls whose deadline passed with nobody looking. */
export async function sweepEndedPolls(db: Database): Promise<number> {
	const now = new Date();
	const rows = await db.postPoll.findMany({
		where: {
			endedNotifiedAt: null,
			OR: [{ closedAt: { not: null } }, { deadline: { lte: now } }],
		},
		select: pollSelect,
	});
	await settleEndedPolls(db, rows, now);
	return rows.length;
}

// ── Options ────────────────────────────────────────────────────────────────

type ResolvedOption = {
	kind: PostPollOptionKind;
	label: string;
	dedupeKey: string;
	bookId: string | null;
	seriesId: string | null;
	userId: string | null;
	refKey: string | null;
};

const empty = { bookId: null, seriesId: null, userId: null, refKey: null };

/** Turns what the member picked into a stored option, checking it really exists. */
async function resolveOption(
	db: Db,
	kind: PostPollOptionKind,
	input: { text?: string; key?: string; label?: string },
	actorId: string,
): Promise<ResolvedOption> {
	if (kind === "text") {
		const text = input.text?.trim();
		if (!text) {
			throw new ORPCError("BAD_REQUEST", { message: "Type the option first." });
		}
		return {
			kind,
			label: text,
			dedupeKey: textDedupeKey(text),
			...empty,
		};
	}

	const key = input.key?.trim();
	if (!key) {
		throw new ORPCError("BAD_REQUEST", { message: "Pick something first." });
	}

	if (kind === "book") {
		const book = await db.book.findUnique({
			where: { slug: key },
			select: { id: true, title: true },
		});
		if (!book) throw new ORPCError("NOT_FOUND", { message: "Book not found." });
		return {
			kind,
			label: book.title,
			dedupeKey: refDedupeKey(kind, book.id),
			...empty,
			bookId: book.id,
		};
	}

	if (kind === "series") {
		const series = await db.series.findUnique({
			where: { slug: key },
			select: { id: true, title: true },
		});
		if (!series)
			throw new ORPCError("NOT_FOUND", { message: "Series not found." });
		return {
			kind,
			label: series.title,
			dedupeKey: refDedupeKey(kind, series.id),
			...empty,
			seriesId: series.id,
		};
	}

	if (kind === "author") {
		const name = input.label?.trim();
		if (!name || authorNameToSlug(name) !== key) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Pick an author from the list.",
			});
		}
		const known = await db.book.findFirst({
			where: { authors: { has: name } },
			select: { id: true },
		});
		if (!known)
			throw new ORPCError("NOT_FOUND", { message: "Author not found." });
		return {
			kind,
			label: name,
			dedupeKey: refDedupeKey(kind, key),
			...empty,
			refKey: key,
		};
	}

	if (kind === "country") {
		const parsed = bookCountryCodeSchema.safeParse(key);
		const name = parsed.success ? getBookCountryName(parsed.data) : null;
		if (!parsed.success || !name) {
			throw new ORPCError("NOT_FOUND", { message: "Country not found." });
		}
		return {
			kind,
			label: name,
			dedupeKey: refDedupeKey(kind, parsed.data),
			...empty,
			refKey: parsed.data,
		};
	}

	const member = await db.user.findUnique({
		where: { username: key },
		select: {
			id: true,
			name: true,
			username: true,
			isHidden: true,
			allowPollOptions: true,
		},
	});
	if (!member || member.isHidden) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	if (!member.allowPollOptions && member.id !== actorId) {
		throw new ORPCError("FORBIDDEN", {
			message: `${authorName(member)} does not allow being used in polls.`,
		});
	}
	return {
		kind,
		label: authorName(member),
		dedupeKey: refDedupeKey(kind, member.id),
		...empty,
		userId: member.id,
	};
}

function optionData(
	pollId: string,
	option: ResolvedOption,
	position: number,
	actorId: string,
	userAdded: boolean,
): Prisma.PostPollOptionUncheckedCreateInput {
	return {
		pollId,
		kind: option.kind,
		label: option.label,
		dedupeKey: option.dedupeKey,
		bookId: option.bookId,
		seriesId: option.seriesId,
		userId: option.userId,
		refKey: option.refKey,
		position,
		userAdded,
		addedById: actorId,
	};
}

/** Creates the poll of a new post. Runs inside the post's transaction. */
export async function createPostPoll(
	tx: DatabaseTransaction,
	postId: string,
	ownerId: string,
	input: CreatePollInput,
): Promise<void> {
	const resolved: ResolvedOption[] = [];
	for (const option of input.options) {
		resolved.push(await resolveOption(tx, input.optionKind, option, ownerId));
	}
	if (new Set(resolved.map((o) => o.dedupeKey)).size !== resolved.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Two of your options are the same.",
		});
	}

	const limits = normalizeChoiceLimits(
		input.type,
		input.minChoices,
		input.maxChoices,
		resolved.length,
	);
	const problem = validatePollSetup({
		type: input.type,
		optionKind: input.optionKind,
		optionCount: resolved.length,
		minChoices: limits.minChoices,
		maxChoices: limits.maxChoices,
		allowUserOptions: input.allowUserOptions,
		maxOptionsPerUser: input.maxOptionsPerUser ?? null,
		maxOptionsTotal: input.maxOptionsTotal ?? null,
		resultsVisibility: input.resultsVisibility,
		deadline: input.deadline ?? null,
	});
	if (problem) {
		throw new ORPCError("BAD_REQUEST", { message: problem });
	}

	const poll = await tx.postPoll.create({
		data: {
			postId,
			type: input.type,
			optionKind: input.optionKind,
			minChoices: limits.minChoices,
			maxChoices: limits.maxChoices,
			allowUserOptions: input.allowUserOptions,
			maxOptionsPerUser: input.allowUserOptions
				? (input.maxOptionsPerUser ?? null)
				: null,
			maxOptionsTotal: input.allowUserOptions
				? (input.maxOptionsTotal ?? null)
				: null,
			resultsVisibility: input.resultsVisibility,
			ballotVisibility: input.ballotVisibility,
			allowVoteChange: input.allowVoteChange,
			deadline: input.deadline ?? null,
		},
		select: { id: true },
	});

	await tx.postPollOption.createMany({
		data: resolved.map((option, index) =>
			optionData(poll.id, option, index, ownerId, false),
		),
	});
}

export async function addPollOption(
	db: Database,
	postSlug: string,
	option: { text?: string; key?: string; label?: string },
	actorId: string,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadPollRow(db, postSlug);
	const now = new Date();
	const isOwner = row.post.authorId === actorId;

	if (pollEnded(row, now)) {
		throw new ORPCError("BAD_REQUEST", { message: "This poll has ended." });
	}
	if (!isOwner) {
		if (!row.allowUserOptions) {
			throw new ORPCError("FORBIDDEN", {
				message: "Only the poll owner can add options.",
			});
		}
		const mine = row.options.filter(
			(o) => o.userAdded && o.addedById === actorId,
		).length;
		const all = row.options.filter((o) => o.userAdded).length;
		if (row.maxOptionsPerUser != null && mine >= row.maxOptionsPerUser) {
			throw new ORPCError("BAD_REQUEST", {
				message: `You can add up to ${row.maxOptionsPerUser} ${row.maxOptionsPerUser === 1 ? "option" : "options"}.`,
			});
		}
		if (row.maxOptionsTotal != null && all >= row.maxOptionsTotal) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Members have added all the options this poll allows.",
			});
		}
	}
	if (row.options.length >= POST_POLL_LIMITS.maxOptions) {
		throw new ORPCError("BAD_REQUEST", {
			message: `A poll can have at most ${POST_POLL_LIMITS.maxOptions} options.`,
		});
	}

	const resolved = await resolveOption(db, row.optionKind, option, actorId);
	if (
		resolved.kind === "text" &&
		row.options.some(
			(existing) => textDedupeKey(existing.label) === resolved.dedupeKey,
		)
	) {
		throw new ORPCError("CONFLICT", {
			message: "That option is already on the poll.",
		});
	}

	const position =
		row.options.reduce((max, o) => Math.max(max, o.position), -1) + 1;
	try {
		await db.postPollOption.create({
			data: optionData(row.id, resolved, position, actorId, !isOwner),
		});
	} catch (error) {
		if ((error as { code?: string }).code === "P2002") {
			throw new ORPCError("CONFLICT", {
				message: "That option is already on the poll.",
			});
		}
		throw error;
	}

	return getPollView(db, postSlug, session);
}

export async function removePollOption(
	db: Database,
	postSlug: string,
	optionId: string,
	actor: PollViewer,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadPollRow(db, postSlug);
	const view = buildPollView(row, actor);
	const option = view.options.find((candidate) => candidate.id === optionId);
	if (!option) {
		throw new ORPCError("NOT_FOUND", { message: "Option not found." });
	}
	if (!option.canRemove) {
		throw new ORPCError("FORBIDDEN", {
			message: view.ended
				? "This poll has ended."
				: "This option cannot be removed any more.",
		});
	}
	if (view.options.length <= POST_POLL_LIMITS.minOptions) {
		throw new ORPCError("BAD_REQUEST", {
			message: `A poll needs at least ${POST_POLL_LIMITS.minOptions} options.`,
		});
	}

	await db.postPollOption.delete({ where: { id: optionId } });
	return getPollView(db, postSlug, session);
}

// ── Voting ─────────────────────────────────────────────────────────────────

export async function votePoll(
	db: Database,
	postSlug: string,
	optionIds: string[],
	userId: string,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadPollRow(db, postSlug);
	if (pollEnded(row, new Date())) {
		throw new ORPCError("BAD_REQUEST", { message: "This poll has ended." });
	}

	const hadBallot = row.votes.some((vote) => vote.userId === userId);
	if (hadBallot && !row.allowVoteChange) {
		throw new ORPCError("FORBIDDEN", {
			message: "Votes cannot be changed on this poll.",
		});
	}

	const problem = validateBallot(
		{ type: row.type, minChoices: row.minChoices, maxChoices: row.maxChoices },
		optionIds,
		new Set(row.options.map((option) => option.id)),
	);
	if (problem) {
		throw new ORPCError("BAD_REQUEST", { message: problem });
	}

	await db.$transaction(async (tx) => {
		await tx.postPollVote.deleteMany({ where: { pollId: row.id, userId } });
		await tx.postPollVote.createMany({
			data: optionIds.map((optionId, index) => ({
				pollId: row.id,
				optionId,
				userId,
				rank: row.type === "ranking" ? index + 1 : null,
			})),
		});
	});

	if (!hadBallot) {
		const voters = new Set(row.votes.map((vote) => vote.userId)).size + 1;
		if (
			row.post.authorId !== userId &&
			(POST_POLL_VOTE_MILESTONES as readonly number[]).includes(voters)
		) {
			void dispatchNotification(db, {
				kind: "poll_vote",
				recipientUserIds: [row.post.authorId],
				title:
					voters === 1
						? "Your poll got its first vote"
						: `${voters} votes on your poll`,
				body:
					voters === 1
						? "Someone just voted on your poll."
						: `${voters} members have voted on your poll so far.`,
				href: `/posts/${row.post.slug}`,
			}).catch((error) =>
				console.error("poll vote notification failed", error),
			);
		}
	}

	return getPollView(db, postSlug, session);
}

export async function retractVote(
	db: Database,
	postSlug: string,
	userId: string,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadPollRow(db, postSlug);
	if (pollEnded(row, new Date())) {
		throw new ORPCError("BAD_REQUEST", { message: "This poll has ended." });
	}
	if (!row.allowVoteChange) {
		throw new ORPCError("FORBIDDEN", {
			message: "Votes cannot be changed on this poll.",
		});
	}
	await db.postPollVote.deleteMany({ where: { pollId: row.id, userId } });
	return getPollView(db, postSlug, session);
}

// ── Owner controls ─────────────────────────────────────────────────────────

async function loadOwnedPoll(db: Db, postSlug: string, actor: PollViewer) {
	const row = await loadPollRow(db, postSlug);
	if (row.post.authorId !== actor.userId && !actor.isAdmin) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the poll owner can change this poll.",
		});
	}
	return row;
}

export async function updatePollSettings(
	db: Database,
	input: {
		postSlug: string;
		type?: "single" | "multiple" | "ranking";
		minChoices?: number;
		maxChoices?: number;
		deadline?: Date | null;
		resultsVisibility?: PollRow["resultsVisibility"];
		ballotVisibility?: PollRow["ballotVisibility"];
		allowVoteChange?: boolean;
		allowUserOptions?: boolean;
		maxOptionsPerUser?: number | null;
		maxOptionsTotal?: number | null;
	},
	actor: PollViewer,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadOwnedPoll(db, input.postSlug, actor);
	const now = new Date();
	if (pollEnded(row, now)) {
		throw new ORPCError("BAD_REQUEST", { message: "This poll has ended." });
	}
	const hasVotes = row.votes.length > 0;
	const data: Prisma.PostPollUpdateInput = {};

	const typeChange =
		(input.type != null && input.type !== row.type) ||
		(input.minChoices != null && input.minChoices !== row.minChoices) ||
		(input.maxChoices != null && input.maxChoices !== row.maxChoices);
	if (typeChange) {
		if (hasVotes) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"The poll type and choice limits cannot change once people have voted.",
			});
		}
		const type = input.type ?? row.type;
		const limits = normalizeChoiceLimits(
			type,
			input.minChoices ?? row.minChoices,
			input.maxChoices ?? row.maxChoices,
			row.options.length,
		);
		data.type = type;
		data.minChoices = limits.minChoices;
		data.maxChoices = limits.maxChoices;
	}

	if (input.deadline !== undefined) {
		if (
			input.deadline &&
			hasVotes &&
			row.deadline &&
			input.deadline < row.deadline
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Once people have voted the deadline can only move later.",
			});
		}
		data.deadline = input.deadline;
	}

	const resultsVisibility = input.resultsVisibility ?? row.resultsVisibility;
	const finalDeadline =
		input.deadline !== undefined ? input.deadline : row.deadline;
	if (resultsVisibility === "after_deadline" && !finalDeadline) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Showing results after the deadline needs a deadline.",
		});
	}
	if (input.resultsVisibility) data.resultsVisibility = input.resultsVisibility;

	if (
		input.ballotVisibility &&
		input.ballotVisibility !== row.ballotVisibility
	) {
		if (
			hasVotes &&
			!isTighterOrEqualBallotVisibility(
				input.ballotVisibility,
				row.ballotVisibility,
			)
		) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"People already voted under the current privacy, so it can only become more private.",
			});
		}
		data.ballotVisibility = input.ballotVisibility;
	}

	if (input.allowVoteChange !== undefined)
		data.allowVoteChange = input.allowVoteChange;

	const allowUserOptions = input.allowUserOptions ?? row.allowUserOptions;
	if (input.allowUserOptions !== undefined)
		data.allowUserOptions = input.allowUserOptions;
	if (allowUserOptions) {
		const perUser = input.maxOptionsPerUser ?? row.maxOptionsPerUser;
		const total = input.maxOptionsTotal ?? row.maxOptionsTotal;
		const problem = validatePollSetup({
			type: (data.type as PollRow["type"] | undefined) ?? row.type,
			optionKind: row.optionKind,
			optionCount: row.options.length,
			minChoices: 1,
			maxChoices: 1,
			allowUserOptions: true,
			maxOptionsPerUser: perUser,
			maxOptionsTotal: total,
			resultsVisibility,
			deadline: null,
		});
		if (problem && !problem.includes("Your options plus")) {
			throw new ORPCError("BAD_REQUEST", { message: problem });
		}
		data.maxOptionsPerUser = perUser;
		data.maxOptionsTotal = total;
	} else if (input.allowUserOptions === false) {
		data.maxOptionsPerUser = null;
		data.maxOptionsTotal = null;
	}

	if (Object.keys(data).length > 0) {
		await db.postPoll.update({ where: { id: row.id }, data });
	}
	return getPollView(db, input.postSlug, session);
}

export async function closePoll(
	db: Database,
	postSlug: string,
	actor: PollViewer,
	session: Session | null,
): Promise<PostPollView> {
	const row = await loadOwnedPoll(db, postSlug, actor);
	if (!pollEnded(row, new Date())) {
		await db.postPoll.update({
			where: { id: row.id },
			data: { closedAt: new Date() },
		});
	}
	return getPollView(db, postSlug, session);
}

// ── Finding things to add ──────────────────────────────────────────────────

export async function searchPollTargets(
	db: Database,
	kind: Exclude<PostPollOptionKind, "text">,
	query: string,
	actorId: string,
) {
	const limit = 8;
	const none = {
		sublabel: null,
		coverId: null,
		image: null,
		disabledReason: null,
	};

	if (kind === "book") {
		const books = await db.book.findMany({
			where: {
				OR: [
					{ title: { contains: query, mode: "insensitive" } },
					{ authors: { has: query } },
				],
			},
			orderBy: { title: "asc" },
			take: limit,
			select: { slug: true, title: true, authors: true, coverId: true },
		});
		return books.map((book) => ({
			key: book.slug,
			label: book.title,
			sublabel: book.authors.join(", ") || null,
			coverId: book.coverId,
			image: null,
			disabledReason: null,
		}));
	}

	if (kind === "series") {
		const rows = await db.series.findMany({
			where: { title: { contains: query, mode: "insensitive" } },
			orderBy: { title: "asc" },
			take: limit,
			select: { slug: true, title: true },
		});
		return rows.map((row) => ({ key: row.slug, label: row.title, ...none }));
	}

	if (kind === "author") {
		const rows = await db.$queryRaw<{ name: string }[]>`
			SELECT DISTINCT author AS name
			FROM book, unnest(authors) AS author
			WHERE author ILIKE ${`%${query}%`}
			ORDER BY author
			LIMIT ${limit}
		`;
		return rows.map((row) => ({
			key: authorNameToSlug(row.name),
			label: row.name,
			...none,
		}));
	}

	if (kind === "country") {
		return searchPollCountries(query, limit).map((country) => ({
			key: country.code,
			label: country.name,
			sublabel: country.code,
			coverId: null,
			image: null,
			disabledReason: null,
		}));
	}

	const members = await db.user.findMany({
		where: {
			...visibleOnSiteUserWhere,
			OR: [
				{ username: { contains: query, mode: "insensitive" } },
				{ name: { contains: query, mode: "insensitive" } },
			],
		},
		orderBy: { username: "asc" },
		take: limit,
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			allowPollOptions: true,
		},
	});
	return members.map((member) => ({
		key: member.username,
		label: member.name,
		sublabel: `@${member.username}`,
		coverId: null,
		image: member.image,
		disabledReason:
			member.allowPollOptions || member.id === actorId
				? null
				: "Does not allow being used in polls",
	}));
}

// ── Preference ─────────────────────────────────────────────────────────────

export async function getPollPreference(db: Database, userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowPollOptions: true },
	});
	return { allowPollOptions: user?.allowPollOptions ?? true };
}

export async function setPollPreference(
	db: Database,
	userId: string,
	allowPollOptions: boolean,
) {
	const user = await db.user.update({
		where: { id: userId },
		data: { allowPollOptions },
		select: { allowPollOptions: true },
	});
	return { allowPollOptions: user.allowPollOptions };
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getPollStats(
	db: Database,
	postSlug: string,
	actor: PollViewer,
	session: Session | null,
): Promise<PollStats> {
	const row = await loadOwnedPoll(db, postSlug, actor);
	const poll = buildPollView(row, actor);
	const post = await db.post.findUnique({
		where: { id: row.post.id },
		select: {
			slug: true,
			content: true,
			createdAt: true,
			author: memberSelect,
		},
	});
	if (!post) {
		throw new ORPCError("NOT_FOUND", { message: "Poll not found" });
	}
	void session;

	const eligibleMembers = await db.user.count({
		where: visibleOnSiteUserWhere,
	});
	const zone = resolveClubTimeZone();
	const isoDay = (date: Date) => {
		const parts = getZonedParts(date, zone);
		return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
	};

	// Group the rows into ballots, one per voter.
	const ballots = new Map<
		string,
		{
			user: { username: string; name: string; image: string | null };
			rows: PollRow["votes"];
		}
	>();
	for (const vote of row.votes) {
		const ballot = ballots.get(vote.userId) ?? { user: vote.user, rows: [] };
		ballot.rows.push(vote);
		ballots.set(vote.userId, ballot);
	}

	const entries = [...ballots.values()].map((ballot) => {
		const rows = [...ballot.rows].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
		const firstAt = new Date(
			Math.min(...rows.map((r) => r.createdAt.getTime())),
		);
		const lastAt = new Date(
			Math.max(...rows.map((r) => r.updatedAt.getTime())),
		);
		return { ...ballot, rows, firstAt, lastAt };
	});

	const perDay = new Map<string, number>();
	const hours = new Array<number>(24).fill(0);
	for (const entry of entries) {
		const day = isoDay(entry.firstAt);
		perDay.set(day, (perDay.get(day) ?? 0) + 1);
		const hour = getZonedParts(entry.firstAt, zone).hour;
		hours[hour] = (hours[hour] ?? 0) + 1;
	}
	let running = 0;
	const timeline = [...perDay.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([day, voters]) => {
			running += voters;
			return { day, voters, cumulative: running };
		});

	const sizes = new Map<number, number>();
	for (const entry of entries) {
		sizes.set(entry.rows.length, (sizes.get(entry.rows.length) ?? 0) + 1);
	}

	const rankMatrix =
		row.type === "ranking"
			? row.options.map((option) => {
					const positions = new Array<number>(row.maxChoices).fill(0);
					for (const vote of row.votes) {
						if (vote.optionId === option.id && vote.rank != null) {
							positions[vote.rank - 1] = (positions[vote.rank - 1] ?? 0) + 1;
						}
					}
					return { optionId: option.id, positions };
				})
			: null;

	const access = poll.ballotAccess;
	const showWho = access === "turnout" || access === "ballots";

	return {
		poll,
		post: {
			slug: post.slug,
			content: post.content,
			createdAt: post.createdAt,
			author: toMember(post.author),
		},
		eligibleMembers,
		totalVoters: entries.length,
		turnoutRate: eligibleMembers > 0 ? entries.length / eligibleMembers : 0,
		totalSelections: row.votes.length,
		changedVotes: entries.filter(
			(entry) => entry.lastAt.getTime() - entry.firstAt.getTime() > 1000,
		).length,
		firstVoteAt: entries.length
			? new Date(Math.min(...entries.map((e) => e.firstAt.getTime())))
			: null,
		lastVoteAt: entries.length
			? new Date(Math.max(...entries.map((e) => e.lastAt.getTime())))
			: null,
		timeline,
		hours,
		ballotSizes: [...sizes.entries()]
			.sort(([a], [b]) => a - b)
			.map(([size, count]) => ({ size, ballots: count })),
		rankMatrix,
		addedOptions: row.options
			.filter((option) => option.userAdded)
			.map((option) => ({
				optionId: option.id,
				label: option.label,
				addedBy: option.addedBy ? toMember(option.addedBy) : null,
				createdAt: option.createdAt,
			})),
		voters: showWho
			? entries
					.sort((a, b) => b.firstAt.getTime() - a.firstAt.getTime())
					.map((entry) => ({
						...toMember(entry.user),
						votedAt: entry.firstAt,
						changedAt:
							entry.lastAt.getTime() - entry.firstAt.getTime() > 1000
								? entry.lastAt
								: null,
						choices:
							access === "ballots" ? entry.rows.map((r) => r.optionId) : null,
					}))
			: null,
	};
}
