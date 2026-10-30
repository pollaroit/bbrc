import { notBannedProcedure } from "../../procedures";
import {
	PrivacySettingsSchema,
	UpdatePrivacySettingsInputSchema,
} from "./privacy.schema";
import { getPrivacySettings, updatePrivacySettings } from "./privacy.service";

export const privacyRouter = {
	get: notBannedProcedure
		.output(PrivacySettingsSchema)
		.handler(({ context }) =>
			getPrivacySettings(context.db, context.session.user.id),
		),
	update: notBannedProcedure
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
