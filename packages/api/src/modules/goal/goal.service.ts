import type { Database, Prisma } from "@bbrc/db";
import {
	allowedGoalYears,
	countReadsForGoal,
	type GoalReadForProgress,
	type GoalScope,
	getClubCalendarYear,
	goalScopeFingerprint,
	goalScopeFromStored,
	isGoalComplete,
	isGoalExpired,
	normalizeGoalAuthorSlugs,
	normalizeGoalCountryCodes,
	readCountsTowardGoal,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	assertMemberVisible,
	type ViewerContext,
} from "../user/user-visibility";
import { awardGoalXp } from "../xp/xp.service";
import type {
	CreateGoalInput,
	GetGoalBySlugOutput,
	ListGoalsByUsernameOutput,
	UpdateGoalInput,
} from "./goal.schema";
import { generateGoalSlug } from "./goal-slug";

const goalSelect = {
	id: true,
	slug: true,
	title: true,
	description: true,
	year: true,
	target: true,
	scopeKind: true,
	scopeAuthors: true,
	scopeCountries: true,
	createdAt: true,
} satisfies Prisma.GoalSelect;

type GoalRow = Prisma.GoalGetPayload<{ select: typeof goalSelect }>;

const readProgressSelect = {
	readEndYear: true,
	readEndMonth: true,
	book: {
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			countries: true,
		},
	},
} satisfies Prisma.ReadSelect;

type ReadProgressRow = Prisma.ReadGetPayload<{
	select: typeof readProgressSelect;
}>;

async function loadUserByUsername(
	username: string,
	viewer: ViewerContext,
	db: Database,
) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, username: true, isHidden: true },
	});

	assertMemberVisible(user, viewer);

	return user;
}

function mapScope(row: GoalRow): GoalScope {
	return goalScopeFromStored({
		scopeKind: row.scopeKind,
		scopeAuthors: row.scopeAuthors,
		scopeCountries: row.scopeCountries,
	});
}

function mapScopeForOutput(scope: GoalScope) {
	return {
		kind: scope.kind,
		authorSlugs: scope.authorSlugs,
		countryCodes: scope.countryCodes,
	};
}

async function loadReadsForGoalYears(
	userId: string,
	years: number[],
	db: Database,
): Promise<ReadProgressRow[]> {
	if (years.length === 0) {
		return [];
	}

	return db.read.findMany({
		where: {
			userId,
			readEndYear: { in: years },
			readEndMonth: { not: null },
		},
		select: readProgressSelect,
		orderBy: [{ readEndYear: "desc" }, { readEndMonth: "desc" }],
	});
}

function mapGoalListItem(
	row: GoalRow,
	reads: readonly GoalReadForProgress[],
	now: Date,
): ListGoalsByUsernameOutput["items"][number] {
	const scope = mapScope(row);
	const current = countReadsForGoal(reads, row.year, scope);

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description,
		year: row.year,
		target: row.target,
		current,
		scope: mapScopeForOutput(scope),
		isComplete: isGoalComplete(current, row.target),
		isExpired: isGoalExpired(row.year, now),
		createdAt: row.createdAt,
	};
}

function partitionGoals(
	items: ListGoalsByUsernameOutput["items"],
): Pick<ListGoalsByUsernameOutput, "active" | "expired"> {
	const active: ListGoalsByUsernameOutput["active"] = [];
	const expired: ListGoalsByUsernameOutput["expired"] = [];

	for (const item of items) {
		if (item.isExpired) {
			expired.push(item);
		} else {
			active.push(item);
		}
	}

	return { active, expired };
}

async function findDuplicateScopeGoal(
	userId: string,
	year: number,
	fingerprint: string,
	db: Database,
	excludeGoalId?: string,
): Promise<boolean> {
	const existing = await db.goal.findMany({
		where: {
			userId,
			year,
			...(excludeGoalId ? { id: { not: excludeGoalId } } : {}),
		},
		select: {
			id: true,
			scopeKind: true,
			scopeAuthors: true,
			scopeCountries: true,
		},
	});

	for (const row of existing) {
		const scope = mapScope(row as GoalRow);
		if (goalScopeFingerprint(scope) === fingerprint) {
			return true;
		}
	}

	return false;
}

function assertGoalYearEditable(
	year: number,
	existingYear: number,
	now = new Date(),
): void {
	if (isGoalExpired(existingYear, now)) {
		if (year !== existingYear) {
			throw new ORPCError("BAD_REQUEST", {
				message: "The year on an expired goal cannot be changed.",
			});
		}
		return;
	}

	const { min, max } = allowedGoalYears(now);
	if (year < min || year > max) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Goals can only use ${min} or ${max} as the year.`,
		});
	}
}

function resolveGoalScopeFromInput(input: CreateGoalInput | UpdateGoalInput): {
	scopeKind: GoalScope["kind"];
	scopeAuthors: string[];
	scopeCountries: string[];
	scope: GoalScope;
} {
	const scopeKind = input.scopeKind;
	let scopeAuthors: string[] = [];
	let scopeCountries: string[] = [];

	if (scopeKind === "authors") {
		scopeAuthors = normalizeGoalAuthorSlugs(input.scopeAuthorSlugs ?? []);
	} else if (scopeKind === "countries") {
		scopeCountries = normalizeGoalCountryCodes(input.scopeCountryCodes ?? []);
	}

	const scope = goalScopeFromStored({
		scopeKind,
		scopeAuthors,
		scopeCountries,
	});

	return { scopeKind, scopeAuthors, scopeCountries, scope };
}

export async function listGoalsByUsername(
	username: string,
	viewer: ViewerContext,
	db: Database,
): Promise<ListGoalsByUsernameOutput> {
	const user = await loadUserByUsername(username, viewer, db);
	const isOwner = viewer?.userId === user.id;

	const rows = await db.goal.findMany({
		where: { userId: user.id },
		select: goalSelect,
		orderBy: [{ year: "desc" }, { createdAt: "desc" }],
	});

	const years = [...new Set(rows.map((row) => row.year))];
	const reads = await loadReadsForGoalYears(user.id, years, db);
	const now = new Date();

	const items = rows.map((row) => mapGoalListItem(row, reads, now));
	const { active, expired } = partitionGoals(items);
	const { options } = allowedGoalYears(now);

	return {
		items,
		active,
		expired,
		isOwner,
		allowedYears: options,
	};
}

export async function getGoalBySlug(
	username: string,
	goalSlug: string,
	viewer: ViewerContext,
	db: Database,
): Promise<GetGoalBySlugOutput> {
	const user = await loadUserByUsername(username, viewer, db);
	const isOwner = viewer?.userId === user.id;

	const row = await db.goal.findUnique({
		where: { userId_slug: { userId: user.id, slug: goalSlug } },
		select: goalSelect,
	});

	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "Goal not found",
			data: { goalSlug },
		});
	}

	const scope = mapScope(row);
	const reads = await loadReadsForGoalYears(user.id, [row.year], db);
	const now = new Date();
	const base = mapGoalListItem(row, reads, now);

	const books = reads
		.filter((read) => readCountsTowardGoal(read, row.year, scope))
		.map((read) => ({
			readEndYear: read.readEndYear!,
			readEndMonth: read.readEndMonth!,
			book: read.book,
		}));

	return {
		...base,
		books,
		isOwner,
	};
}

export async function createGoal(
	input: CreateGoalInput,
	userId: string,
	db: Database,
): Promise<{ slug: string }> {
	const { scopeKind, scopeAuthors, scopeCountries, scope } =
		resolveGoalScopeFromInput(input);

	const fingerprint = goalScopeFingerprint(scope);
	const duplicate = await findDuplicateScopeGoal(
		userId,
		input.year,
		fingerprint,
		db,
	);

	if (duplicate) {
		throw new ORPCError("CONFLICT", {
			message:
				"You already have a goal for this year with the same scope. Change the scope or pick another year.",
		});
	}

	return db.$transaction(async (tx) => {
		const slug = await generateGoalSlug(input.title, userId, tx);

		const goal = await tx.goal.create({
			data: {
				userId,
				slug,
				title: input.title.trim(),
				description: input.description?.trim() || null,
				year: input.year,
				target: input.target,
				scopeKind,
				scopeAuthors,
				scopeCountries,
			},
			select: { id: true, slug: true },
		});

		await awardGoalXp({ userId, goalId: goal.id }, tx);

		return { slug: goal.slug };
	});
}

export async function updateGoal(
	input: UpdateGoalInput,
	userId: string,
	db: Database,
): Promise<{ slug: string }> {
	const existing = await db.goal.findFirst({
		where: { userId, slug: input.goalSlug },
		select: { ...goalSelect, userId: true },
	});

	if (!existing) {
		throw new ORPCError("NOT_FOUND", {
			message: "Goal not found",
			data: { goalSlug: input.goalSlug },
		});
	}

	assertGoalYearEditable(input.year, existing.year);

	const { scopeKind, scopeAuthors, scopeCountries, scope } =
		resolveGoalScopeFromInput(input);

	const fingerprint = goalScopeFingerprint(scope);
	const duplicate = await findDuplicateScopeGoal(
		userId,
		input.year,
		fingerprint,
		db,
		existing.id,
	);

	if (duplicate) {
		throw new ORPCError("CONFLICT", {
			message:
				"You already have a goal for this year with the same scope. Change the scope or pick another year.",
		});
	}

	await db.goal.update({
		where: { id: existing.id },
		data: {
			title: input.title.trim(),
			description: input.description?.trim() || null,
			year: input.year,
			target: input.target,
			scopeKind,
			scopeAuthors,
			scopeCountries,
		},
	});

	return { slug: existing.slug };
}

export function getGoalAllowedYears(): [number, number] {
	return allowedGoalYears().options;
}

export function getGoalCurrentCalendarYear(): number {
	return getClubCalendarYear();
}
