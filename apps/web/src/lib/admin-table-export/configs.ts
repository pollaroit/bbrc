import type { ListAdminBooksOutput } from "@bbrc/api/modules/admin/admin-book.schema";
import type { ListAdminCommentsOutput } from "@bbrc/api/modules/admin/admin-comment.schema";
import type { ListAdminDocumentsOutput } from "@bbrc/api/modules/admin/admin-document.schema";
import type { ListAdminFeedbacksOutput } from "@bbrc/api/modules/admin/admin-feedback.schema";
import type { ListAdminPostsOutput } from "@bbrc/api/modules/admin/admin-post.schema";
import type { ListAdminSeriesOutput } from "@bbrc/api/modules/admin/admin-series.schema";
import type { ListAdminShelvesOutput } from "@bbrc/api/modules/admin/admin-shelf.schema";
import type { ListAdminSittingsOutput } from "@bbrc/api/modules/admin/admin-sitting.schema";
import type { ListAdminUsersOutput } from "@bbrc/api/modules/admin/admin-user.schema";
import type {
	AdminAuthorListInput,
	AdminAuthorListOutput,
} from "@bbrc/api/modules/author-admin/author-dashboard.schema";
import { contentPlainText, getBookCountryName } from "@bbrc/shared";
import { formatBookAuthors } from "@/lib/book-cover";
import { client } from "@/utils/orpc";
import type { AdminTableExportField, AdminTableExportResource } from "./types";

function formatBookCountries(codes: string[]): string {
	return codes.map((code) => getBookCountryName(code) ?? code).join("; ");
}

type UserItem = ListAdminUsersOutput["items"][number];
type BookItem = ListAdminBooksOutput["items"][number];
type SittingItem = ListAdminSittingsOutput["items"][number];
type FeedbackItem = ListAdminFeedbacksOutput["items"][number];
type ShelfItem = ListAdminShelvesOutput["items"][number];
type SeriesItem = ListAdminSeriesOutput["items"][number];
type PostItem = ListAdminPostsOutput["items"][number];
type CommentItem = ListAdminCommentsOutput["items"][number];
type DocumentItem = ListAdminDocumentsOutput["items"][number];
type AuthorItem = AdminAuthorListOutput["items"][number];

export type AdminTableExportConfig<TItem> = {
	resource: AdminTableExportResource;
	fields: AdminTableExportField<TItem>[];
	fetchPage: (
		input: Record<string, unknown>,
	) => Promise<{ items: TItem[]; metadata: ListAdminUsersOutput["metadata"] }>;
};

function defaultSelected<TItem>(
	fields: AdminTableExportField<TItem>[],
): Set<string> {
	return new Set(
		fields
			.filter((field) => field.defaultSelected !== false)
			.map((field) => field.key),
	);
}

export const adminUsersExportFields: AdminTableExportField<UserItem>[] = [
	{ key: "username", label: "Username", getValue: (r) => r.username },
	{ key: "name", label: "Name", getValue: (r) => r.name },
	{ key: "email", label: "Email", getValue: (r) => r.email },
	{ key: "status", label: "Status", getValue: (r) => r.status },
	{ key: "isAdmin", label: "Administrator", getValue: (r) => r.isAdmin },
	{
		key: "emailVerified",
		label: "Email verified",
		getValue: (r) => r.emailVerified,
	},
	{ key: "xp", label: "XP", getValue: (r) => r.xp },
	{ key: "rp", label: "RP", getValue: (r) => r.rp },
	{
		key: "telegramUserId",
		label: "Telegram user ID",
		getValue: (r) => r.telegramUserId,
	},
	{
		key: "telegramUsername",
		label: "Telegram username",
		getValue: (r) => r.telegramUsername,
	},
	{ key: "posts", label: "Posts", getValue: (r) => r.counts.posts },
	{ key: "comments", label: "Comments", getValue: (r) => r.counts.comments },
	{ key: "likes", label: "Likes", getValue: (r) => r.counts.likes },
	{
		key: "feedbacks",
		label: "Feedbacks",
		getValue: (r) => r.counts.feedbacks,
	},
	{
		key: "participations",
		label: "Sitting participations",
		getValue: (r) => r.counts.participations,
	},
	{ key: "favorites", label: "Favorites", getValue: (r) => r.counts.favorites },
	{ key: "reads", label: "Reads", getValue: (r) => r.counts.reads },
	{ key: "shelves", label: "Shelves", getValue: (r) => r.counts.shelves },
	{ key: "createdAt", label: "Joined", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminBooksExportFields: AdminTableExportField<BookItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{ key: "title", label: "Title", getValue: (r) => r.title },
	{
		key: "authors",
		label: "Authors",
		getValue: (r) => formatBookAuthors(r.authors),
	},
	{
		key: "countries",
		label: "Countries",
		getValue: (r) => formatBookCountries(r.countries),
	},
	{ key: "status", label: "Status", getValue: (r) => r.status },
	{ key: "pages", label: "Pages", getValue: (r) => r.pages },
	{
		key: "averageRating",
		label: "Club rating",
		getValue: (r) => r.averageRating,
	},
	{
		key: "openLibraryRating",
		label: "Open Library rating",
		getValue: (r) => r.openLibraryRating,
	},
	{ key: "publishedIn", label: "Published in", getValue: (r) => r.publishedIn },
	{ key: "olid", label: "Open Library ID", getValue: (r) => r.olid },
	{
		key: "excerptPreview",
		label: "Excerpt preview",
		getValue: (r) => r.excerptPreview,
	},
	{ key: "favorites", label: "Favorites", getValue: (r) => r.counts.favorites },
	{ key: "reads", label: "Reads", getValue: (r) => r.counts.reads },
	{ key: "feedbacks", label: "Feedbacks", getValue: (r) => r.counts.feedbacks },
	{
		key: "shelfBooks",
		label: "Shelf placements",
		getValue: (r) => r.counts.shelfBooks,
	},
	{
		key: "postAttachments",
		label: "Post attachments",
		getValue: (r) => r.counts.postAttachments,
	},
	{
		key: "pollOptions",
		label: "Poll options",
		getValue: (r) => r.counts.pollOptions,
	},
	{
		key: "pollVotes",
		label: "Poll votes",
		getValue: (r) => r.counts.pollVotes,
	},
	{
		key: "latestSittingSlug",
		label: "Latest sitting slug",
		getValue: (r) => r.latestSittingSlug,
	},
	{
		key: "requestedBy",
		label: "Requested by",
		getValue: (r) => r.requestedBy?.username ?? null,
	},
	{
		key: "approvedBy",
		label: "Approved by",
		getValue: (r) => r.approvedBy?.username ?? null,
	},
	{ key: "createdAt", label: "Added", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminSittingsExportFields: AdminTableExportField<SittingItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{ key: "status", label: "Status", getValue: (r) => r.status },
	{ key: "deadline", label: "Deadline", getValue: (r) => r.deadline },
	{
		key: "readingStartedAt",
		label: "Reading started",
		getValue: (r) => r.readingStartedAt,
	},
	{ key: "midtermAt", label: "Midterm", getValue: (r) => r.midtermAt },
	{
		key: "telegramPollAnnounced",
		label: "Telegram poll announced",
		getValue: (r) => r.telegramPollAnnounced,
	},
	{
		key: "selectedBookSlug",
		label: "Selected book slug",
		getValue: (r) => r.selectedBook?.slug ?? null,
	},
	{
		key: "selectedBookTitle",
		label: "Selected book title",
		getValue: (r) => r.selectedBook?.title ?? null,
	},
	{
		key: "selectedBookPages",
		label: "Selected book pages",
		getValue: (r) => r.selectedBook?.pages ?? null,
	},
	{
		key: "selectedBookStatus",
		label: "Selected book status",
		getValue: (r) => r.selectedBook?.status ?? null,
	},
	{ key: "pollSlug", label: "Poll slug", getValue: (r) => r.pollSlug },
	{
		key: "participants",
		label: "Participants",
		getValue: (r) => r.counts.participants,
	},
	{
		key: "activeParticipants",
		label: "Active participants",
		getValue: (r) => r.counts.activeParticipants,
	},
	{
		key: "completedParticipants",
		label: "Completed readers",
		getValue: (r) => r.counts.completedParticipants,
	},
	{
		key: "dnfParticipants",
		label: "DNF",
		getValue: (r) => r.counts.dnfParticipants,
	},
	{
		key: "pollOptions",
		label: "Poll options",
		getValue: (r) => r.counts.pollOptions,
	},
	{
		key: "pollVotes",
		label: "Poll votes",
		getValue: (r) => r.counts.pollVotes,
	},
	{
		key: "postAttachments",
		label: "Post attachments",
		getValue: (r) => r.counts.postAttachments,
	},
	{ key: "createdAt", label: "Started", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminFeedbacksExportFields: AdminTableExportField<FeedbackItem>[] =
	[
		{ key: "slug", label: "Feedback slug", getValue: (r) => r.slug },
		{ key: "rating", label: "Rating", getValue: (r) => r.rating },
		{
			key: "review",
			label: "Review",
			getValue: (r) => contentPlainText(r.review),
		},
		{
			key: "reviewLength",
			label: "Review length",
			getValue: (r) => r.reviewLength,
		},
		{
			key: "authorUsername",
			label: "Author username",
			getValue: (r) => r.author.username,
		},
		{ key: "authorName", label: "Author name", getValue: (r) => r.author.name },
		{ key: "bookSlug", label: "Book slug", getValue: (r) => r.book.slug },
		{ key: "bookTitle", label: "Book title", getValue: (r) => r.book.title },
		{ key: "bookPages", label: "Book pages", getValue: (r) => r.book.pages },
		{ key: "bookStatus", label: "Book status", getValue: (r) => r.book.status },
		{
			key: "bookAverageRating",
			label: "Book club rating",
			getValue: (r) => r.book.averageRating,
		},
		{ key: "likes", label: "Likes", getValue: (r) => r.counts.likes },
		{ key: "comments", label: "Comments", getValue: (r) => r.counts.comments },
		{
			key: "postAttachments",
			label: "Post attachments",
			getValue: (r) => r.counts.postAttachments,
		},
		{ key: "createdAt", label: "Submitted", getValue: (r) => r.createdAt },
		{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
		{
			key: "id",
			label: "Internal ID",
			defaultSelected: false,
			getValue: (r) => r.id,
		},
	];

export const adminUsersExportConfig: AdminTableExportConfig<UserItem> = {
	resource: "users",
	fields: adminUsersExportFields,
	fetchPage: (input) => client.admin.listUsers(input),
};

export const adminBooksExportConfig: AdminTableExportConfig<BookItem> = {
	resource: "books",
	fields: adminBooksExportFields,
	fetchPage: (input) => client.admin.listBooks(input),
};

export const adminSittingsExportConfig: AdminTableExportConfig<SittingItem> = {
	resource: "sittings",
	fields: adminSittingsExportFields,
	fetchPage: (input) => client.admin.listSittings(input),
};

export const adminFeedbacksExportConfig: AdminTableExportConfig<FeedbackItem> =
	{
		resource: "feedbacks",
		fields: adminFeedbacksExportFields,
		fetchPage: (input) => client.admin.listFeedbacks(input),
	};

export const adminShelvesExportFields: AdminTableExportField<ShelfItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{ key: "title", label: "Title", getValue: (r) => r.title },
	{
		key: "description",
		label: "Description",
		getValue: (r) => r.description,
	},
	{ key: "status", label: "Status", getValue: (r) => r.status },
	{ key: "type", label: "List type", getValue: (r) => r.type },
	{
		key: "ownerUsername",
		label: "Owner username",
		getValue: (r) => r.owner.username,
	},
	{ key: "ownerName", label: "Owner name", getValue: (r) => r.owner.name },
	{
		key: "coverImageUrl",
		label: "Cover image URL",
		getValue: (r) => r.coverImageUrl,
	},
	{ key: "books", label: "Books", getValue: (r) => r.counts.books },
	{
		key: "postAttachments",
		label: "Post attachments",
		getValue: (r) => r.counts.postAttachments,
	},
	{ key: "createdAt", label: "Created", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminPostsExportFields: AdminTableExportField<PostItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{
		key: "content",
		label: "Content",
		getValue: (r) => contentPlainText(r.content),
	},
	{
		key: "contentLength",
		label: "Content length",
		getValue: (r) => r.contentLength,
	},
	{
		key: "authorUsername",
		label: "Author username",
		getValue: (r) => r.author.username,
	},
	{ key: "authorName", label: "Author name", getValue: (r) => r.author.name },
	{ key: "imageUrl", label: "Image URL", getValue: (r) => r.imageUrl },
	{
		key: "attachedBookSlug",
		label: "Attached book slug",
		getValue: (r) => r.attachedBook?.slug ?? null,
	},
	{
		key: "attachedBookTitle",
		label: "Attached book title",
		getValue: (r) => r.attachedBook?.title ?? null,
	},
	{
		key: "attachmentKind",
		label: "Attachment kind",
		getValue: (r) => r.attachmentKind,
	},
	{ key: "likes", label: "Likes", getValue: (r) => r.counts.likes },
	{ key: "comments", label: "Comments", getValue: (r) => r.counts.comments },
	{ key: "createdAt", label: "Posted", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{ key: "editedAt", label: "Edited at", getValue: (r) => r.editedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminShelvesExportConfig: AdminTableExportConfig<ShelfItem> = {
	resource: "shelves",
	fields: adminShelvesExportFields,
	fetchPage: (input) => client.admin.listShelves(input),
};

export const adminSeriesExportFields: AdminTableExportField<SeriesItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{ key: "title", label: "Title", getValue: (r) => r.title },
	{
		key: "description",
		label: "Description",
		getValue: (r) => r.description,
	},
	{ key: "bookCount", label: "Books", getValue: (r) => r.bookCount },
	{ key: "createdAt", label: "Created", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
];

export const adminSeriesExportConfig: AdminTableExportConfig<SeriesItem> = {
	resource: "series",
	fields: adminSeriesExportFields,
	fetchPage: (input) => client.admin.listSeries(input),
};

export const adminPostsExportConfig: AdminTableExportConfig<PostItem> = {
	resource: "posts",
	fields: adminPostsExportFields,
	fetchPage: (input) => client.admin.listPosts(input),
};

export const adminCommentsExportFields: AdminTableExportField<CommentItem>[] = [
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{
		key: "content",
		label: "Content",
		getValue: (r) => contentPlainText(r.content),
	},
	{
		key: "contentLength",
		label: "Content length",
		getValue: (r) => r.contentLength,
	},
	{
		key: "contextType",
		label: "Context",
		getValue: (r) => r.context.type,
	},
	{
		key: "postSlug",
		label: "Post slug",
		getValue: (r) => r.context.postSlug,
	},
	{
		key: "feedbackSlug",
		label: "Feedback slug",
		getValue: (r) => r.context.feedbackSlug,
	},
	{
		key: "bookSlug",
		label: "Book slug",
		getValue: (r) => r.context.bookSlug,
	},
	{
		key: "authorUsername",
		label: "Author username",
		getValue: (r) => r.author.username,
	},
	{ key: "authorName", label: "Author name", getValue: (r) => r.author.name },
	{ key: "depth", label: "Depth", getValue: (r) => r.depth },
	{ key: "parentSlug", label: "Parent slug", getValue: (r) => r.parentSlug },
	{ key: "likes", label: "Likes", getValue: (r) => r.counts.likes },
	{ key: "replies", label: "Replies", getValue: (r) => r.counts.replies },
	{ key: "imageUrl", label: "Image URL", getValue: (r) => r.imageUrl },
	{ key: "createdAt", label: "Posted", getValue: (r) => r.createdAt },
	{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
	{ key: "editedAt", label: "Edited at", getValue: (r) => r.editedAt },
	{
		key: "id",
		label: "Internal ID",
		defaultSelected: false,
		getValue: (r) => r.id,
	},
];

export const adminDocumentsExportFields: AdminTableExportField<DocumentItem>[] =
	[
		{ key: "slug", label: "Slug", getValue: (r) => r.slug },
		{ key: "name", label: "Name", getValue: (r) => r.name },
		{ key: "language", label: "Language", getValue: (r) => r.language },
		{ key: "status", label: "Status", getValue: (r) => r.status },
		{
			key: "submitterUsername",
			label: "Submitter username",
			getValue: (r) => r.submitter.username,
		},
		{
			key: "submitterName",
			label: "Submitter name",
			getValue: (r) => r.submitter.name,
		},
		{ key: "bookSlug", label: "Book slug", getValue: (r) => r.book.slug },
		{ key: "bookTitle", label: "Book title", getValue: (r) => r.book.title },
		{
			key: "acceptanceNotes",
			label: "Acceptance notes",
			getValue: (r) => r.acceptanceNotes,
		},
		{
			key: "rejectionReason",
			label: "Rejection reason",
			getValue: (r) => r.rejectionReason,
		},
		{ key: "createdAt", label: "Submitted", getValue: (r) => r.createdAt },
		{ key: "updatedAt", label: "Updated", getValue: (r) => r.updatedAt },
		{
			key: "id",
			label: "Internal ID",
			defaultSelected: false,
			getValue: (r) => r.id,
		},
	];

export const adminCommentsExportConfig: AdminTableExportConfig<CommentItem> = {
	resource: "comments",
	fields: adminCommentsExportFields,
	fetchPage: (input) => client.admin.listComments(input),
};

export const adminDocumentsExportConfig: AdminTableExportConfig<DocumentItem> =
	{
		resource: "documents",
		fields: adminDocumentsExportFields,
		fetchPage: (input) => client.admin.listDocuments(input),
	};

export function defaultSelectedFieldKeys<TItem>(
	fields: AdminTableExportField<TItem>[],
): Set<string> {
	return defaultSelected(fields);
}

export const adminAuthorsExportFields: AdminTableExportField<AuthorItem>[] = [
	{ key: "name", label: "Name", getValue: (r) => r.name },
	{ key: "slug", label: "Slug", getValue: (r) => r.slug },
	{ key: "status", label: "Status", getValue: (r) => r.status },
	{
		key: "enrichmentStatus",
		label: "Lookup",
		getValue: (r) => r.enrichmentStatus,
	},
	{
		key: "nationalities",
		label: "Nationalities",
		getValue: (r) => formatBookCountries(r.nationalities),
	},
	{ key: "gender", label: "Gender", getValue: (r) => r.gender },
	{ key: "birthYear", label: "Birth year", getValue: (r) => r.birthYear },
	{ key: "deathYear", label: "Death year", getValue: (r) => r.deathYear },
	{ key: "bookCount", label: "Books", getValue: (r) => r.bookCount },
	{ key: "readerCount", label: "Readers", getValue: (r) => r.readerCount },
	{ key: "readCount", label: "Reads", getValue: (r) => r.readCount },
	{
		key: "followerCount",
		label: "Followers",
		getValue: (r) => r.followerCount,
	},
	{
		key: "missingFields",
		label: "Missing fields",
		defaultSelected: false,
		getValue: (r) => r.missingFields.join("; "),
	},
	{
		key: "sources",
		label: "Sources",
		defaultSelected: false,
		getValue: (r) => r.sources.join("; "),
	},
	{ key: "createdAt", label: "Added", getValue: (r) => r.createdAt },
];

export const adminAuthorsExportConfig: AdminTableExportConfig<AuthorItem> = {
	resource: "authors",
	fields: adminAuthorsExportFields,
	fetchPage: (input) => client.authorAdmin.list(input as AdminAuthorListInput),
};
