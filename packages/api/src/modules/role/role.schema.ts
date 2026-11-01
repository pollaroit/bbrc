import { RoleSchema } from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";

export const SetRoleInputSchema = zod.object({
	username: zod.string().min(3).max(20),
	role: RoleSchema,
});

export const SetRoleOutputSchema = zod.object({
	username: zod.string(),
	role: RoleSchema,
});

export type SetRoleInput = z.infer<typeof SetRoleInputSchema>;
export type SetRoleOutput = z.infer<typeof SetRoleOutputSchema>;
