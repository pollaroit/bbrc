import { protectedProcedure } from "../../procedures";
import {
	PrivacySettingsSchema,
	UpdatePrivacySettingsInputSchema,
} from "./privacy.schema";
import { getPrivacySettings, updatePrivacySettings } from "./privacy.service";

export const privacyRouter = {
	get: protectedProcedure
		.output(PrivacySettingsSchema)
		.handler(({ context }) =>
			getPrivacySettings(context.db, context.session.user.id),
		),
	update: protectedProcedure
		.input(UpdatePrivacySettingsInputSchema)
		.output(PrivacySettingsSchema)
		.handler(({ input, context }) =>
			updatePrivacySettings(
				context.db,
				context,
				context.session.user.id,
				input,
			),
		),
};
