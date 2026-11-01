import { protectedProcedure, publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	GetBookmarkCountsInputSchema,
	GetBookmarkCountsOutputSchema,
	GetBookmarkListInputSchema,
	GetBookmarkListOutputSchema,
	GetViewerBookmarksInputSchema,
	GetViewerBookmarksOutputSchema,
	ListSavedBookmarksInputSchema,
	ListSavedBookmarksOutputSchema,
	SetBookmarkInputSchema,
	ToggleBookmarkInputSchema,
	ToggleBookmarkOutputSchema,
} from "./bookmark.schema";
import {
	getBookmarkCounts,
	getBookmarkList,
	getViewerBookmarks,
	listSavedBookmarks,
	setBookmark,
	toggleBookmark,
} from "./bookmark.service";

export const bookmarkRouter = {
	list: publicProcedure
		.input(ListSavedBookmarksInputSchema)
		.output(ListSavedBookmarksOutputSchema)
		.handler(async ({ input, context }) =>
			listSavedBookmarks(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	listMarks: publicProcedure
		.input(GetBookmarkListInputSchema)
		.output(GetBookmarkListOutputSchema)
		.handler(async ({ input, context }) =>
			getBookmarkList(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	getViewerBookmarks: publicProcedure
		.input(GetViewerBookmarksInputSchema)
		.output(GetViewerBookmarksOutputSchema)
		.handler(async ({ input, context }) =>
			getViewerBookmarks(input, context.session?.user.id ?? null, context.db),
		),
	getBookmarkCounts: publicProcedure
		.input(GetBookmarkCountsInputSchema)
		.output(GetBookmarkCountsOutputSchema)
		.handler(async ({ input, context }) =>
			getBookmarkCounts(input, context.session?.user.id ?? null, context.db),
		),
	set: protectedProcedure
		.input(SetBookmarkInputSchema)
		.output(ToggleBookmarkOutputSchema)
		.handler(async ({ input, context }) =>
			setBookmark(
				input,
				context.session.user.id,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	toggle: protectedProcedure
		.input(ToggleBookmarkInputSchema)
		.output(ToggleBookmarkOutputSchema)
		.handler(async ({ input, context }) =>
			toggleBookmark(
				input,
				context.session.user.id,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
};
