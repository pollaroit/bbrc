import { publicProcedure } from "../../procedures";
import {
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
				context.session
					? {
							userId: context.session.user.id,
							isAdmin: context.session.user.isAdmin === true,
						}
					: null,
			),
		})),
};
