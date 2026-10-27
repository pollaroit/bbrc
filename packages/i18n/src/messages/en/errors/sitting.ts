import { defineMessages } from "../../types";

/** Errors of the `sitting` area. Key = what went wrong; ICU parameters like {max}. */
export const sittingErrors = defineMessages({
	addNotAllowedMany:
		"{count, plural, one {{names} does not allow being added to sittings. Invite them once the sitting exists instead.} other {{names} do not allow being added to sittings. Invite them once the sitting exists instead.}}",
	addNotAllowedOne:
		"{name} does not allow being added to sittings. Send them an invitation instead.",
	alreadyOngoing: "A sitting is already in progress",
	alreadyParticipant: "Member is already on this sitting",
	bookNotFound: "Book not found",
	finishNeedsReading: "Only sittings in reading can be marked finished",
	finished: "This sitting has finished.",
	invitation: {
		alreadyIn: "{name} is already in this sitting.",
		alreadyInvited: "{name} already has an invitation.",
		notAccepted: "{name} does not accept sitting invitations.",
		notFound: "Invitation not found.",
		wasRemoved:
			"{name} was removed from this sitting. Add them back directly instead.",
	},
	join: {
		accountUnavailable: "This action is not available for your account.",
		alreadyIn: "You are already in this sitting.",
		banned: "Banned members cannot join a sitting.",
		lastPerson: "You are the last person in this sitting, so you cannot leave.",
		leaveOnlyWhileVoting:
			"You can only leave while voting is open. Once reading starts, everyone who is in stays in.",
		notInSitting: "You are not in this sitting.",
		privateOrganisersOnly:
			"This sitting is private. Only its organisers can add people.",
		removedByOrganiser:
			"An organiser removed you from this sitting, so only an organiser can add you back.",
		settingsFixed: "This sitting has finished, so its join settings are fixed.",
		signIn: "Sign in to join.",
		viaLinkOnly: "This sitting is joined with an invitation link.",
		window: {
			finished: "This sitting has finished, so nobody can join any more.",
			passed: "The time to join this sitting has passed.",
			readingClosed: "Joining is not open while this sitting is being read.",
			votingClosed: "Joining is not open while voting for this sitting.",
		},
	},
	link: {
		expiryInPast: "The expiry must be in the future.",
		invitationLinkNotFound: "Invitation link not found",
		maxLifetime: "A link can last at most a year.",
		notFound: "Link not found",
		privateNoLinks:
			"Private sittings have no invitation links. Make it Unlisted or Public first.",
		state: {
			active: "This link works.",
			exhausted:
				"This invitation link has been used as many times as it allows.",
			expired: "This invitation link has expired.",
			revoked: "This invitation link was ended by the organiser.",
		},
		tooMany: "A sitting can have at most {max} links. End one first.",
	},
	memberNotFound: "Member not found.",
	noPoll: "This sitting has no poll",
	noPollDeadline: "This sitting has no poll deadline to update",
	noPollToClose: "This sitting has no poll to close",
	noSelectedBookToComplete: "This sitting has no selected book to complete",
	notAcceptingVotes: "This sitting is not accepting votes",
	notFound: "Sitting not found",
	notFoundAfterFinish: "Sitting not found after finish",
	organisersOnly: "Only the sitting's organisers can do that.",
	participantNotFound: "Participant not found on this sitting",
	participantsLocked:
		"Participants can only be changed while voting or reading",
	poll: {
		duplicateLocked: "Duplicate locked books are not allowed",
		duplicateOptions: "Poll options must not include duplicate books",
		lockedNotInOptions: "Locked book is not in the current option list",
		noBooksMatch: "No wishlist books match the poll filters",
		noReplacementAvailable:
			"No other eligible wishlist books are available for this replacement",
		notEnoughBooks:
			"Not enough wishlist books match the poll filters (need at least {take})",
		optionBooksMissing: "One or more poll option books were not found",
		optionCountMismatch: "Expected {take} current poll options",
		optionsNotEligible:
			"One or more poll options are not eligible wishlist books for this configuration",
		participantsMissing: "One or more selected participants do not exist",
		replaceNotInOptions:
			"The book to replace is not in the current option list",
		replacementLoadFailed: "Could not load the replacement book",
		selectedNotInPoll: "Selected book is not part of this poll",
		slugFailed: "Failed to generate a unique poll slug",
		wrongOptionCount: "Poll must have exactly {expected} options",
	},
	pollNotFound: "Poll not found for this sitting",
	pollOptionNotFound: "Poll option not found",
	progress: {
		changeNotAllowed:
			"Cannot change progress from {current, select, not_started {not started} in_progress {reading} completed {completed} dnf {did not finish} other {{current}}} to {next, select, not_started {not started} in_progress {reading} completed {completed} dnf {did not finish} other {{next}}}",
		dnfAutomatic: "DNF is applied automatically when a sitting ends",
	},
	progressOnlyWhileReading:
		"Progress can only be updated during the reading phase",
	progressParticipantsOnly: "Only sitting participants can update progress",
	readerListsParticipantsOnly:
		"Only sitting participants can view reader lists",
	removeFinished: "Cannot remove a member who already finished the book",
	removeLast: "Cannot remove the last participant",
	selectedBookNotFound: "Selected book was not found",
	signInToFilter: "Sign in to filter by your sittings.",
	slugFailed: "Failed to generate a unique sitting slug",
	startReadingNeedsVoting: "Only sittings in voting can start reading",
	vote: {
		duplicate: "Duplicate poll options are not allowed",
		goldenNotAllowed: "You cannot use a Golden chip on this poll",
		invalidPoints: "Invalid vote points",
		oneGoldenMax: "You can use at most one Golden chip",
		oneSilverMax: "You can use at most one Silver chip",
		optionNotOnPoll: "One or more selected options are not on this poll",
		selectAtLeast:
			"Select at least {min, plural, one {# book} other {# books}}",
		selectAtMost: "Select at most {max, plural, one {# book} other {# books}}",
		silverNotAllowed: "You cannot use a Silver chip on this poll",
	},
	voteParticipantsOnly: "Only sitting participants can vote",
});
