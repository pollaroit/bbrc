import { defineMessages } from "../../types";

/** Interface texts of the `listing` area. */
export const listing = defineMessages({
	filters: {
		clear: "Clear filters",
		clearAll: "Clear all filters",
		description: "Narrow results with filters and ranges.",
		title: "Filters",
	},
	multi: {
		authors: {
			aria: "Search authors in list",
			clear: "Clear authors",
			legend: "Authors",
			noneFilters: "No authors match the current filters.",
			noneSearch: "No authors match your search.",
			placeholder: "Search authors…",
		},
		books: {
			aria: "Search books in list",
			clear: "Clear books ({count})",
			legend: "Books",
			none: "No completed books match.",
			placeholder: "Search completed books…",
			search: "Search books",
		},
		clearAll: "Clear all",
		countries: {
			clear: "Clear countries",
			legend: "Literary origin",
			noneCatalog: "No countries match the current catalog filters.",
			placeholder: "Search countries…",
			search: "Search countries",
		},
		feedbacks: {
			aria: "Search feedbacks in list",
			legend: "Feedbacks",
			none: "No feedbacks match. Try book title, review text, or @username.",
			placeholder: "Search by review, book, author, or slug…",
		},
		members: {
			aria: "Search members in list",
			legend: "Members",
			placeholder: "Search by name or username…",
		},
		nationality: {
			legend: "Nationality",
			noneFilters: "No countries match the current author filters.",
		},
		posts: {
			aria: "Search posts in list",
			legend: "Posts",
			none: "No posts match. Try searching content or @username.",
			placeholder: "Search by content, slug, or author…",
		},
		selected: "{legend} ({count} selected)",
	},
	range: {
		anyTime: "Any time",
		apply: "Apply",
		cancel: "Cancel",
		dateRange: "Date range",
		field: "Field",
		max: "Max",
		maximum: "Maximum",
		min: "Min",
		minimum: "Minimum",
	},
	ratingSlider: {
		any: "Any rating",
		between: "{low} to {high} stars",
		single: "{rating} stars",
	},
	search: {
		placeholder: "Search…",
	},
	sort: {
		asc: "Ascending",
		by: "Sort by",
		desc: "Descending",
		list: "Sort list",
	},
});
