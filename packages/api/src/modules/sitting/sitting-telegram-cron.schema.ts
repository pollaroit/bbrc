import { SittingSchema } from "@bbrc/schemas";
import zod from "zod";

export const SittingTelegramCronJobSchema = zod.discriminatedUnion("type", [
	zod.object({
		type: zod.literal("midterm_progress_poll"),
		sittingSlug: SittingSchema.shape.slug,
	}),
	zod.object({
		type: zod.literal("reading_24h_warning"),
		sittingSlug: SittingSchema.shape.slug,
	}),
]);

export type SittingTelegramCronJob = zod.infer<
	typeof SittingTelegramCronJobSchema
>;
