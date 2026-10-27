import { defineMessages } from "../types";

/** Messages of our own form and input checks (the standard ones, like "too short", come from zod's own language set). */
export const validation = defineMessages({
	readDates: {
		dayNeedsMonth: "Pick a month as well as a day.",
		invalidDay: "That day does not exist in that month.",
		endBeforeStart: "The end date cannot be before the start date.",
	},
	readFinish: {
		monthAndYearTogether: "Set the finish month and year together.",
	},
	rating: {
		halfSteps: "Choose a rating in half-star steps from 0 to 5.",
	},
	ratingDefinition: {
		empty: "Write something, or reset to the default.",
		tooLong: "Keep it under {max} characters.",
	},
	profile: {
		websiteUrl: "Enter a website address that starts with https://.",
		bioTooLong: "Your bio can be at most {max} characters.",
		unknownGenre: "That genre does not exist.",
		unknownSubgenre: "That subgenre does not exist.",
		subgenreNeedsGenre: "Pick a genre before choosing its subgenres.",
		unknownSocialSite: "That site is not supported.",
		socialAlreadyAdded: "{site} is already added.",
		socialInvalidUrl: "Enter a valid {site} profile address, like {example}.",
	},
	goal: {
		scopeFiltersWithAllBooks:
			"Remove the filters when the goal covers all books.",
		authorsOrCountries: "Pick authors or countries, not both.",
		selectAuthor: "Select at least one author.",
		invalidAuthor: "One of the selected authors is not valid.",
		selectCountry: "Select at least one country.",
		yearOnly: "A goal can only be set for {min} or {max}.",
	},
	edition: {
		invalidIsbn: "That is not a valid ISBN.",
	},
});
