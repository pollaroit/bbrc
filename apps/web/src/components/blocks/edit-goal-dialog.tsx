"use client";

import type {
	GetGoalBySlugOutput,
	UpdateGoalInput,
} from "@bbrc/api/modules/goal/goal.schema";
import { allowedGoalYears } from "@bbrc/shared";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	GoalFormDialog,
	type GoalFormValues,
} from "@/components/blocks/goal-form-dialog";
import { orpc, queryClient } from "@/utils/orpc";

type EditGoalDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	goal: GetGoalBySlugOutput;
};

export function EditGoalDialog({
	open,
	onOpenChange,
	username,
	goal,
}: EditGoalDialogProps) {
	const yearLocked = goal.isExpired;
	const allowedYears = allowedGoalYears().options;
	const yearOptions = useMemo(() => {
		if (yearLocked) {
			return [goal.year];
		}
		return [...new Set<number>([...allowedYears, goal.year])].sort(
			(a, b) => a - b,
		);
	}, [allowedYears, goal.year, yearLocked]);

	const initial = useMemo<GoalFormValues>(
		() => ({
			title: goal.title,
			description: goal.description ?? "",
			year: goal.year,
			target: goal.target,
			scopeKind: goal.scope.kind,
			authorSlugs: goal.scope.authorSlugs,
			countryCodes: goal.scope.countryCodes,
			visibility: goal.visibility,
		}),
		[goal],
	);

	const updateMutation = useMutation(
		orpc.goal.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.goal.listByUsername.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.goal.getBySlug.key({
						input: { username, goalSlug: goal.slug },
					}),
				});
				toast.success("Goal updated");
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not update goal");
			},
		}),
	);

	return (
		// Remounts on open so the form always starts from the saved goal.
		<GoalFormDialog
			key={open ? "open" : "closed"}
			open={open}
			onOpenChange={onOpenChange}
			heading="Edit goal"
			blurb={
				yearLocked
					? "This goal is from a past year. You can update the details, but not the year."
					: "Change the target, scope, or other details. Progress still follows your reads."
			}
			submitLabel="Save changes"
			pending={updateMutation.isPending}
			initial={initial}
			yearOptions={yearOptions}
			yearLocked={yearLocked}
			onSubmit={(values) => {
				const payload: UpdateGoalInput = {
					goalSlug: goal.slug,
					title: values.title,
					description: values.description.trim() || undefined,
					year: values.year,
					target: values.target,
					scopeKind: values.scopeKind,
					...(values.visibility ? { visibility: values.visibility } : {}),
					...(values.scopeKind === "authors"
						? { scopeAuthorSlugs: values.authorSlugs }
						: {}),
					...(values.scopeKind === "countries"
						? { scopeCountryCodes: values.countryCodes }
						: {}),
				};
				updateMutation.mutate(payload);
			}}
		/>
	);
}
