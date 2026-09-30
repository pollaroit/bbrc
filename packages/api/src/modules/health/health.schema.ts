import { z } from "zod";

export const HealthOutputSchema = z.object({
	api: z.literal("ok"),
	database: z.literal("ok"),
});

export type THealthOutputSchema = z.infer<typeof HealthOutputSchema>;
