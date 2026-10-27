import { defineMessages } from "../../types";

export const postPollErrors = defineMessages({
	notFound: "Poll not found",
	typeOptionFirst: "Type the option first.",
	pickFirst: "Pick something first.",
	bookNotFound: "Book not found.",
	seriesNotFound: "Series not found.",
	authorNotFound: "Author not found.",
	countryNotFound: "Country not found.",
	memberNotFound: "Member not found.",
	memberNoPolls: "{name} does not allow being used in polls.",
	duplicateOptions: "Two of your options are the same.",
	ended: "This poll has ended.",
	ownerOnlyAddOptions: "Only the poll owner can add options.",
	limitPerMember:
		"You can add up to {count, plural, one {# option} other {# options}}.",
	optionsFull: "Members have added all the options this poll allows.",
	maxOptions: "A poll can have at most {max} options.",
	optionExists: "That option is already on the poll.",
	optionNotFound: "Option not found.",
	optionLocked: "This option cannot be removed any more.",
	minOptions: "A poll needs at least {min} options.",
	votesLocked: "Votes cannot be changed on this poll.",
	ownerOnlyChange: "Only the poll owner can change this poll.",
	typeLocked:
		"The poll type and choice limits cannot change once people have voted.",
	deadlineLaterOnly: "Once people have voted the deadline can only move later.",
	resultsNeedDeadline: "Showing results after the deadline needs a deadline.",
	privacyOnlyStricter:
		"People already voted under the current privacy, so it can only become more private.",
	/** What is wrong with a new poll or a ballot (see `pollSetupProblem` / `ballotProblem` in shared). */
	problem: {
		pickOnce: "Pick each option only once.",
		optionNotOnPoll: "One of those options is not on this poll.",
		pickOne: "Pick one option.",
		pickAtLeast:
			"Please pick at least {count, plural, one {# option} other {# options}}.",
		pickAtMost:
			"Please pick at most {count, plural, one {# option} other {# options}}.",
		rankAtLeast:
			"Please rank at least {count, plural, one {# option} other {# options}}.",
		rankAtMost:
			"Please rank at most {count, plural, one {# option} other {# options}}.",
		addMinOptions: "Add at least {min} options.",
		tooManyOptions: "A poll can have at most {max} options.",
		choicesOrder: "The fewest choices cannot be more than the most.",
		choicesOverOptions: "Members cannot pick more options than the poll has.",
		resultsNeedDeadline: "Showing results after the deadline needs a deadline.",
		deadlineTooSoon: "The deadline must be at least {min} minutes away.",
		deadlineTooFar: "The deadline can be at most {max} days away.",
		memberLimitsMissing:
			"Set how many options each member and everyone together may add.",
		memberLimitOverTotal:
			"Each member's limit cannot be higher than the total limit.",
		optionsOverLimit:
			"Your options plus the ones members may add cannot go over {max}.",
	},
});
