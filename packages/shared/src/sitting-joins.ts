/** Mirrors `SittingJoinType` in Prisma — keep in sync with `sitting.prisma`. */
export const SITTING_JOIN_TYPES = ["public", "unlisted", "private"] as const;
export type SittingJoinType = (typeof SITTING_JOIN_TYPES)[number];

export const SITTING_JOIN_TYPE_LABELS: Record<
	SittingJoinType,
	{ label: string; hint: string }
> = {
	public: {
		label: "Public",
		hint: "Anyone can join. Members see the sitting in their feed with a Join button.",
	},
	unlisted: {
		label: "Unlisted",
		hint: "Only people with your invitation link or QR code can join. There is no Join button.",
	},
	private: {
		label: "Private",
		hint: "Only organisers add people, or invite them to accept. There is no Join button and no link.",
	},
};

export const DEFAULT_JOIN_UNTIL_PERCENT = 50;
export const MIN_JOIN_UNTIL_PERCENT = 10;
export const MAX_JOIN_UNTIL_PERCENT = 100;

export const MAX_SITTING_INVITE_LINKS = 10;
export const DEFAULT_INVITE_LINK_DAYS = 7;

export type SittingJoinConfig = {
	joinType: SittingJoinType;
	joinInVoting: boolean;
	joinInReading: boolean;
	joinReadingUntilPercent: number;
};

export const DEFAULT_SITTING_JOIN_CONFIG: SittingJoinConfig = {
	joinType: "public",
	joinInVoting: true,
	joinInReading: true,
	joinReadingUntilPercent: DEFAULT_JOIN_UNTIL_PERCENT,
};

type WindowInput = SittingJoinConfig & {
	status: "voting" | "reading" | "finished";
	readingStartedAt: Date | null;
	deadline: Date;
};

export type JoinWindowClosedReason =
	| "finished"
	| "voting_not_open_to_joins"
	| "reading_not_open_to_joins"
	| "reading_window_passed";

export type JoinWindow = {
	open: boolean;
	reason: JoinWindowClosedReason | null;
	/** The moment self-joining stops, when it stops at a set time. */
	closesAt: Date | null;
};

/**
 * The moment self-joining ends during reading: a share of the way from the
 * day reading started to the deadline. Null until reading has started.
 */
export function readingJoinCutoff(
	input: Pick<
		WindowInput,
		"readingStartedAt" | "deadline" | "joinReadingUntilPercent"
	>,
): Date | null {
	if (!input.readingStartedAt) return null;
	const start = input.readingStartedAt.getTime();
	const span = Math.max(0, input.deadline.getTime() - start);
	const percent = Math.min(
		MAX_JOIN_UNTIL_PERCENT,
		Math.max(MIN_JOIN_UNTIL_PERCENT, input.joinReadingUntilPercent),
	);
	return new Date(start + (span * percent) / 100);
}

/** Whether people can join by themselves right now (button, link or QR code). */
export function selfJoinWindow(
	input: WindowInput,
	now: Date = new Date(),
): JoinWindow {
	if (input.status === "finished") {
		return { open: false, reason: "finished", closesAt: null };
	}
	if (input.status === "voting") {
		return input.joinInVoting
			? { open: true, reason: null, closesAt: null }
			: { open: false, reason: "voting_not_open_to_joins", closesAt: null };
	}
	if (!input.joinInReading) {
		return { open: false, reason: "reading_not_open_to_joins", closesAt: null };
	}
	const cutoff = readingJoinCutoff(input);
	if (cutoff && now.getTime() >= cutoff.getTime()) {
		return { open: false, reason: "reading_window_passed", closesAt: cutoff };
	}
	return { open: true, reason: null, closesAt: cutoff };
}

export function joinWindowMessage(reason: JoinWindowClosedReason): string {
	switch (reason) {
		case "finished":
			return "This sitting has finished, so nobody can join any more.";
		case "voting_not_open_to_joins":
			return "Joining is not open while voting for this sitting.";
		case "reading_not_open_to_joins":
			return "Joining is not open while this sitting is being read.";
		case "reading_window_passed":
			return "The time to join this sitting has passed.";
	}
}

/** Public sittings take Join clicks and links; unlisted ones take links only; private ones neither. */
export function joinTypeAllows(
	joinType: SittingJoinType,
	via: "button" | "link",
): boolean {
	if (joinType === "public") return true;
	if (joinType === "unlisted") return via === "link";
	return false;
}

export type InviteLinkState = "active" | "revoked" | "expired" | "exhausted";

export function inviteLinkState(
	link: {
		expiresAt: Date | null;
		maxUses: number | null;
		uses: number;
		revokedAt: Date | null;
	},
	now: Date = new Date(),
): InviteLinkState {
	if (link.revokedAt) return "revoked";
	if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
		return "expired";
	}
	if (link.maxUses != null && link.uses >= link.maxUses) return "exhausted";
	return "active";
}

export function inviteLinkStateMessage(state: InviteLinkState): string {
	switch (state) {
		case "active":
			return "This link works.";
		case "revoked":
			return "This invitation link was ended by the organiser.";
		case "expired":
			return "This invitation link has expired.";
		case "exhausted":
			return "This invitation link has been used as many times as it allows.";
	}
}
