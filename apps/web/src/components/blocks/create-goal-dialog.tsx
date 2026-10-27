"use client";

import type { CreateGoalInput } from "@bbrc/api/modules/goal/goal.schema";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	GoalFormDialog,
	type GoalFormValues,
} from "@/components/blocks/goal-form-dialog";
import { useRouter } from "@/i18n/navigation";
import { orpc, queryClient } from "@/utils/orpc";

type CreateGoalDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	allowedYears: [number, number];
};

export function CreateGoalDialog({
	open,
	onOpenChange,
	username,
	allowedYears,
}: CreateGoalDialogProps) {
	const router = useRouter();

	const initial = useMemo<GoalFormValues>(
		() => ({
			title: "",
			description: "",
			year: allowedYears[0],
			target: 12,
			scopeKind: "none",
			authorSlugs: [],
			countryCodes: [],
		}),
		[allowedYears],
	);

	const createMutation = useMutation(
		orpc.goal.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.goal.listByUsername.key(),
				});
				toast.success("Goal created");
				onOpenChange(false);
				router.push(`/users/${username}/goals/${data.slug}` as Route);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not create goal");
			},
		}),
	);

	return (
		// Remounts the form each time the dialog opens so it starts blank.
		<GoalFormDialog
			key={open ? "open" : "closed"}
			open={open}
			onOpenChange={onOpenChange}
			heading="New reading goal"
			blurb={`Set a book count for ${allowedYears[0]} or ${allowedYears[1]}.`}
			submitLabel="Create goal"
			pending={createMutation.isPending}
			initial={initial}
			yearOptions={allowedYears}
			onSubmit={(values) => {
				const payload: CreateGoalInput = {
					title: values.title,
					description: values.description.trim() || undefined,
					year: values.year,
					target: values.target,
					scopeKind: values.scopeKind,
					...(values.scopeKind === "authors"
						? { scopeAuthorSlugs: values.authorSlugs }
						: {}),
					...(values.scopeKind === "countries"
						? { scopeCountryCodes: values.countryCodes }
						: {}),
				};
				createMutation.mutate(payload);
			}}
		/>
	);
}
