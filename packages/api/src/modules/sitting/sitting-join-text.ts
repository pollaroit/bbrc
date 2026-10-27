import { createServerTranslator } from "@bbrc/i18n";
import type { InviteLinkState, JoinWindowClosedReason } from "@bbrc/shared";
import type { ErrorKey, ErrorParams } from "../../lib/app-error";
import { currentLocale } from "../../lib/request-locale";

/**
 * The text of an error key in the language of the current request, for messages that are
 * RETURNED to the page (why you cannot join) instead of thrown.
 */
export function errorText(key: ErrorKey, params?: ErrorParams): string {
	const translate = createServerTranslator(currentLocale(), "errors") as (
		key: string,
		values?: ErrorParams,
	) => string;
	return translate(key, params);
}

/** Why joining is closed, by the reason the join window reports. */
export const joinWindowKey: Record<JoinWindowClosedReason, ErrorKey> = {
	finished: "sitting.join.window.finished",
	voting_not_open_to_joins: "sitting.join.window.votingClosed",
	reading_not_open_to_joins: "sitting.join.window.readingClosed",
	reading_window_passed: "sitting.join.window.passed",
};

/** What is wrong with an invitation link that is not active. */
export const inviteLinkStateKey: Record<
	Exclude<InviteLinkState, "active">,
	ErrorKey
> = {
	revoked: "sitting.link.state.revoked",
	expired: "sitting.link.state.expired",
	exhausted: "sitting.link.state.exhausted",
};

/** The sentence for any invitation link state, in the language of the current request. */
export function inviteLinkStateText(state: InviteLinkState): string {
	return errorText(
		state === "active"
			? "sitting.link.state.active"
			: inviteLinkStateKey[state],
	);
}
