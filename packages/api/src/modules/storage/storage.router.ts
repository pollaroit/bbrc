import { z } from "zod";
import { adminProcedure, notBannedProcedure } from "../../procedures";
import {
	CommitUploadInputSchema,
	CommitUploadOutputSchema,
	InitUploadInputSchema,
	InitUploadOutputSchema,
} from "./storage.schema";
import {
	commitUpload,
	getStorageStatus,
	initUpload,
	removeObject,
} from "./storage.service";

const StorageStatusOutputSchema = z.object({
	configured: z.boolean(),
	env: z.enum(["development", "preview", "production"]),
});

export const storageRouter = {
	status: notBannedProcedure
		.output(StorageStatusOutputSchema)
		.handler(async () => getStorageStatus()),
	initUpload: notBannedProcedure
		.input(InitUploadInputSchema)
		.output(InitUploadOutputSchema)
		.handler(async ({ input, context }) => initUpload(input, context.session)),
	commitUpload: notBannedProcedure
		.input(CommitUploadInputSchema)
		.output(CommitUploadOutputSchema)
		.handler(async ({ input, context }) =>
			commitUpload(input, context.session),
		),
	removeObject: adminProcedure
		.input(z.object({ key: z.string().min(1) }))
		.output(z.object({ ok: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeObject(input.key, context.session),
		),
};
