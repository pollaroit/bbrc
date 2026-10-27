import { defineMessages } from "../../types";

export const seriesErrors = defineMessages({
	notFound: "Series not found.",
	slugFailed:
		"Could not create a web address for this series. Try a different title.",
	invalidSlug: "That address is not valid. Use letters, numbers and dashes.",
	slugTaken: "A series with this address already exists.",
	alreadyInSeries: "This book is already in “{series}”. Remove it there first.",
	placeTaken:
		"Place {position} is taken by “{book}”. Move the other books down or pick another place.",
	bookNotInSeries: "This book is not in this series.",
	reorderMissing: "The new order must include every book in the series.",
	reorderForeign: "The new order includes a book that is not in this series.",
	reorderDuplicate: "The new order contains duplicate books.",
});
