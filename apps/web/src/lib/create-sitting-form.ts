import {
	type CreateSittingInput,
	CreateSittingInputSchema,
} from "@bbrc/api/modules/sitting/sitting.schema";
import { defaultPollDeadline } from "@bbrc/shared";
import zod from "zod";

function emptyToUndefined(value: unknown) {
	return value === "" || value === null ? undefined : value;
}

export const CreateSittingFormSchema = zod
	.object({
		pollDeadline: zod.date(),
		participantUserIds: zod.array(zod.string().uuid()).min(1),
		poll: zod.object({
			minPages: zod.preprocess(
				emptyToUndefined,
				zod.coerce.number().int().min(0).optional(),
			),
			maxPages: zod.preprocess(
				emptyToUndefined,
				zod.coerce.number().int().min(0).optional(),
			),
			take: zod.coerce.number().int().min(2).max(12),
			minChoices: zod.coerce.number().int().min(1).max(12),
			maxChoices: zod.coerce.number().int().min(1).max(12),
		}),
	})
	.superRefine((value, ctx) => {
		CreateSittingInputSchema.safeParse({
			pollDeadline: value.pollDeadline,
			participantUserIds: value.participantUserIds,
			poll: value.poll,
		}).error?.issues.forEach((issue) => {
			const path =
				issue.path[0] === "poll"
					? ["poll", ...issue.path.slice(1)]
					: issue.path;
			ctx.addIssue({ ...issue, path });
		});
	});

export type CreateSittingFormValues = zod.infer<typeof CreateSittingFormSchema>;

export function defaultCreatePollDeadline(): Date {
	return defaultPollDeadline();
}

export function toCreateSittingInput(
	values: CreateSittingFormValues,
): CreateSittingInput {
	return {
		pollDeadline: values.pollDeadline,
		participantUserIds: values.participantUserIds,
		poll: {
			minPages: values.poll.minPages,
			maxPages: values.poll.maxPages,
			take: values.poll.take,
			minChoices: values.poll.minChoices,
			maxChoices: values.poll.maxChoices,
		},
	};
}

export const defaultCreateSittingFormValues: CreateSittingFormValues = {
	pollDeadline: defaultCreatePollDeadline(),
	participantUserIds: [],
	poll: {
		take: 10,
		minChoices: 1,
		maxChoices: 10,
	},
};
