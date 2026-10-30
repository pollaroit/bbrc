import { publicProcedure } from "../../procedures";
import { resolveExternalPreviews } from "../link-unfurl/link-unfurl.service";
import { loadViewer } from "../visibility/viewer";
import {
	ResolveExternalLinkPreviewsInputSchema,
	ResolveExternalLinkPreviewsOutputSchema,
	ResolveLinkPreviewsInputSchema,
	ResolveLinkPreviewsOutputSchema,
} from "./link-preview.schema";
import { resolveLinkPreviews } from "./link-preview.service";

export const linkPreviewRouter = {
	resolve: publicProcedure
		.input(ResolveLinkPreviewsInputSchema)
		.output(ResolveLinkPreviewsOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await resolveLinkPreviews(
				context.db,
				input.refs,
				await loadViewer(context.db, context.session),
			),
		})),
	/** Previews of outside links, read from the cache (see the `link-unfurl` module). */
	resolveExternal: publicProcedure
		.input(ResolveExternalLinkPreviewsInputSchema)
		.output(ResolveExternalLinkPreviewsOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await resolveExternalPreviews(
				context.db,
				input.urls,
				context.session ? { userId: context.session.user.id } : null,
			),
		})),
};
