import {
	defaultUserReadExportFieldKeys,
	type UserReadExportFieldKey,
	userReadExportFieldKeys,
} from "@bbrc/api/modules/read/read-export.schema";

export type { UserReadExportFieldKey };
export { defaultUserReadExportFieldKeys, userReadExportFieldKeys };

export const userReadExportFieldLabels: Record<UserReadExportFieldKey, string> =
	{
		title: "Title",
		authors: "Authors",
		slug: "Slug",
		olid: "Open Library work ID",
		status: "Catalog status",
		pages: "Pages",
		publishedIn: "Publication year",
		averageRating: "Club average rating",
		openLibraryRating: "Open Library rating",
		readEndYear: "Finish year",
		readEndMonth: "Finish month",
		editionId: "Edition OLID",
		recordedAt: "Logged in app",
		myRating: "My rating",
		myReview: "My review",
		isSpoiler: "Review has spoiler",
		isbn13: "ISBN-13",
		isbn10: "ISBN-10",
		publisher: "Publisher",
		binding: "Binding",
	};
