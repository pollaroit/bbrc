import { UserSchema } from "@bbrc/schemas";
import {
	POST_POLL_BALLOT_VISIBILITY,
	POST_POLL_LIMITS,
	POST_POLL_OPTION_KINDS,
	POST_POLL_RESULTS_VISIBILITY,
	POST_POLL_TYPES,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const PollTypeSchema = zod.enum(POST_POLL_TYPES);
export const PollOptionKindSchema = zod.enum(POST_POLL_OPTION_KINDS);
export const PollResultsVisibilitySchema = zod.enum(
	POST_POLL_RESULTS_VISIBILITY,
);
export const PollBallotVisibilitySchema = zod.enum(POST_POLL_BALLOT_VISIBILITY);

export const PollMemberSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: zod
		.string()
		.nullish()
		.transform((value) => value ?? null),
});

/** What an option points at, for rendering. Only the fields of its kind are set. */
export const PollOptionTargetSchema = zod.object({
	slug: zod.string().nullable(),
	title: zod.string().nullable(),
	authors: zod.array(zod.string()),
	coverId: zod.number().nullable(),
	username: zod.string().nullable(),
	name: zod.string().nullable(),
	image: zod.string().nullable(),
	code: zod.string().nullable(),
});

export const PollOptionResultSchema = zod.object({
	voters: zod.number().int().min(0),
	share: zod.number().min(0),
	points: zod.number().int().min(0),
	firstChoices: zod.number().int().min(0),
	rankSum: zod.number().int().min(0),
});

export const PollOptionSchema = zod.object({
	id: zod.string(),
	kind: PollOptionKindSchema,
	label: zod.string(),
	position: zod.number().int().min(0),
	userAdded: zod.boolean(),
	addedBy: PollMemberSchema.nullable(),
	target: PollOptionTargetSchema,
	canRemove: zod.boolean(),
	/** Null while the viewer may not see results. */
	result: PollOptionResultSchema.nullable(),
	/** Who chose this option, when the viewer is allowed to see ballots. */
	voters: zod
		.array(PollMemberSchema.extend({ rank: zod.number().int().nullable() }))
		.nullable(),
});

export const PostPollViewSchema = zod.object({
	id: zod.string(),
	type: PollTypeSchema,
	minChoices: zod.number().int(),
	maxChoices: zod.number().int(),
	optionKind: PollOptionKindSchema,
	allowUserOptions: zod.boolean(),
	maxOptionsPerUser: zod.number().int().nullable(),
	maxOptionsTotal: zod.number().int().nullable(),
	resultsVisibility: PollResultsVisibilitySchema,
	ballotVisibility: PollBallotVisibilitySchema,
	allowVoteChange: zod.boolean(),
	deadline: zod.coerce.date().nullable(),
	closedAt: zod.coerce.date().nullable(),
	ended: zod.boolean(),
	resultsVisible: zod.boolean(),
	/** Null while results are hidden from the viewer. */
	totalVoters: zod.number().int().nullable(),
	ballotAccess: zod.enum(["none", "turnout", "ballots"]),
	/** Everyone who voted, when the viewer may see turnout. */
	turnout: zod.array(PollMemberSchema).nullable(),
	viewer: zod.object({
		isOwner: zod.boolean(),
		hasVoted: zod.boolean(),
		/** The viewer's option ids; for ranking, in ranked order. */
		myBallot: zod.array(zod.string()),
		canVote: zod.boolean(),
		/** Why voting is not possible right now, for the button label. */
		blockedReason: zod.string().nullable(),
		canAddOption: zod.boolean(),
		/** How many more the viewer may add (null for no limit). */
		ownOptionsLeft: zod.number().int().nullable(),
		/** Only for the owner: votes exist, so the setup is partly locked. */
		hasVotes: zod.boolean(),
	}),
	options: zod.array(PollOptionSchema),
});

export type PostPollView = z.infer<typeof PostPollViewSchema>;
export type PollOption = z.infer<typeof PollOptionSchema>;

// ── Inputs ─────────────────────────────────────────────────────────────────

/** A text option, or a thing from the club identified by its key (slug, code, username). */
export const PollOptionInputSchema = zod.object({
	text: zod
		.string()
		.trim()
		.min(1)
		.max(POST_POLL_LIMITS.optionTextMax)
		.optional(),
	key: zod.string().trim().min(1).max(200).optional(),
	/** The display name for authors (their key is only a slug). */
	label: zod.string().trim().min(1).max(200).optional(),
});

const optionsLimit = POST_POLL_LIMITS.maxOptions;

export const CreatePollInputSchema = zod.object({
	type: PollTypeSchema,
	optionKind: PollOptionKindSchema,
	options: zod.array(PollOptionInputSchema).min(2).max(optionsLimit),
	minChoices: zod.number().int().min(1).max(optionsLimit).optional(),
	maxChoices: zod.number().int().min(1).max(optionsLimit).optional(),
	allowUserOptions: zod.boolean().default(false),
	maxOptionsPerUser: zod.number().int().min(1).max(optionsLimit).nullish(),
	maxOptionsTotal: zod.number().int().min(1).max(optionsLimit).nullish(),
	resultsVisibility: PollResultsVisibilitySchema.default("everyone"),
	ballotVisibility: PollBallotVisibilitySchema.default("owner"),
	allowVoteChange: zod.boolean().default(true),
	deadline: zod.coerce.date().nullish(),
});

export type CreatePollInput = z.infer<typeof CreatePollInputSchema>;

const postSlug = zod.string().min(1).max(120);

export const GetPollInputSchema = zod.object({ postSlug });

export const VotePollInputSchema = zod.object({
	postSlug,
	/** The chosen options; for ranking, in order of preference. */
	optionIds: zod.array(zod.string()).min(1).max(optionsLimit),
});

export const RetractVoteInputSchema = zod.object({ postSlug });

export const AddPollOptionInputSchema = zod.object({
	postSlug,
	option: PollOptionInputSchema,
});

export const RemovePollOptionInputSchema = zod.object({
	postSlug,
	optionId: zod.string(),
});

export const UpdatePollSettingsInputSchema = zod.object({
	postSlug,
	type: PollTypeSchema.optional(),
	minChoices: zod.number().int().min(1).max(optionsLimit).optional(),
	maxChoices: zod.number().int().min(1).max(optionsLimit).optional(),
	/** Pass null to remove the deadline. */
	deadline: zod.coerce.date().nullish(),
	resultsVisibility: PollResultsVisibilitySchema.optional(),
	ballotVisibility: PollBallotVisibilitySchema.optional(),
	allowVoteChange: zod.boolean().optional(),
	allowUserOptions: zod.boolean().optional(),
	maxOptionsPerUser: zod.number().int().min(1).max(optionsLimit).nullish(),
	maxOptionsTotal: zod.number().int().min(1).max(optionsLimit).nullish(),
});

export const ClosePollInputSchema = zod.object({ postSlug });

export const SearchPollTargetsInputSchema = zod.object({
	kind: PollOptionKindSchema.exclude(["text"]),
	query: zod.string().trim().min(1).max(60),
	/** Who is picking: a poll builder, or someone attaching to a post. Members can opt out of each. */
	purpose: zod.enum(["poll", "attachment"]).default("poll"),
});

export const PollTargetSuggestionSchema = zod.object({
	key: zod.string(),
	label: zod.string(),
	sublabel: zod.string().nullable(),
	coverId: zod.number().nullable(),
	image: zod.string().nullable(),
	/** Why it cannot be picked, e.g. a member who does not allow it. */
	disabledReason: zod.string().nullable(),
});

export const SearchPollTargetsOutputSchema = zod.object({
	items: zod.array(PollTargetSuggestionSchema),
});

export const PollPreferenceSchema = zod.object({
	allowPollOptions: zod.boolean(),
});

export const OkSchema = zod.object({ ok: zod.literal(true) });

// ── Stats ──────────────────────────────────────────────────────────────────

export const PollStatsSchema = zod.object({
	poll: PostPollViewSchema,
	post: zod.object({
		slug: zod.string(),
		content: zod.string(),
		createdAt: zod.coerce.date(),
		author: PollMemberSchema,
	}),
	eligibleMembers: zod.number().int(),
	totalVoters: zod.number().int(),
	turnoutRate: zod.number(),
	totalSelections: zod.number().int(),
	/** Members who replaced their vote at least once. */
	changedVotes: zod.number().int(),
	/** All replacements added up. */
	totalChanges: zod.number().int(),
	firstVoteAt: zod.coerce.date().nullable(),
	lastVoteAt: zod.coerce.date().nullable(),
	/** Voters per day, oldest first, in club time. */
	timeline: zod.array(
		zod.object({
			day: zod.string(),
			voters: zod.number().int(),
			cumulative: zod.number().int(),
		}),
	),
	/** Voters per hour of the day (0-23), in club time. */
	hours: zod.array(zod.number().int()),
	/** Ballot sizes: how many options people picked, and how many ballots had that size. */
	ballotSizes: zod.array(
		zod.object({ size: zod.number().int(), ballots: zod.number().int() }),
	),
	/** For ranking polls: how many ballots put each option at each position. */
	rankMatrix: zod
		.array(
			zod.object({
				optionId: zod.string(),
				positions: zod.array(zod.number().int()),
			}),
		)
		.nullable(),
	/** Options added by members. */
	addedOptions: zod.array(
		zod.object({
			optionId: zod.string(),
			label: zod.string(),
			addedBy: PollMemberSchema.nullable(),
			createdAt: zod.coerce.date(),
		}),
	),
	/** Who voted and when, when ballot privacy allows the owner to see it. */
	voters: zod
		.array(
			PollMemberSchema.extend({
				votedAt: zod.coerce.date(),
				changedAt: zod.coerce.date().nullable(),
				changes: zod.number().int(),
				/** The options they chose, in order; null when ballots are not visible. */
				choices: zod.array(zod.string()).nullable(),
			}),
		)
		.nullable(),
});

export type PollStats = z.infer<typeof PollStatsSchema>;
