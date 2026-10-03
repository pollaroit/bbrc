import {
	type BookExportFieldKey,
	bookExportFieldKeys,
	defaultBookExportFieldKeys,
} from "@bbrc/api/modules/book/book-export.schema";

export type { BookExportFieldKey };
export { bookExportFieldKeys, defaultBookExportFieldKeys };

export const bookExportFieldLabels: Record<BookExportFieldKey, string> = {
	title: "Title",
	authors: "Authors",
	status: "Status",
	averageRating: "Average rating",
	openLibraryRating: "Open Library rating",
	pages: "Pages",
	publishedIn: "Publication year",
	slug: "Slug",
	olid: "Open Library ID",
	excerpt: "Excerpt",
	subjects: "Subjects",
	subjectPeople: "Subject people",
	subjectTimes: "Subject times",
	feedbackCount: "Feedback count",
	favoriteCount: "Favorite count",
	createdAt: "Date added",
	updatedAt: "Last updated",
};
