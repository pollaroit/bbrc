"use client";

import type {
	GetGoalBySlugOutput,
	UpdateGoalInput,
} from "@bbrc/api/modules/goal/goal.schema";
import { allowedGoalYears } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShelfOptionPicker } from "@/components/blocks/shelf-form-options";
import { ListingAuthorMultiSelect } from "@/components/listing/listing-author-multi-select";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { orpc, queryClient } from "@/utils/orpc";

const scopeOptions = [
	{
		value: "none" as const,
		title: "All books",
		description: "Every finished read in the goal year counts.",
	},
	{
		value: "authors" as const,
		title: "By author",
		description: "Only books by selected authors count.",
	},
	{
		value: "countries" as const,
		title: "By country",
		description: "Only books from selected literary origins count.",
	},
];

type EditGoalDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	goal: GetGoalBySlugOutput;
};

type ScopeKind = UpdateGoalInput["scopeKind"];

export function EditGoalDialog({
	open,
	onOpenChange,
	username,
	goal,
}: EditGoalDialogProps) {
	const titleId = useId();
	const [title, setTitle] = useState(goal.title);
	const [description, setDescription] = useState(goal.description ?? "");
	const [year, setYear] = useState(goal.year);
	const [target, setTarget] = useState(String(goal.target));
	const [scopeKind, setScopeKind] = useState<ScopeKind>(goal.scope.kind);
	const [authorSlugs, setAuthorSlugs] = useState(goal.scope.authorSlugs);
	const [countryCodes, setCountryCodes] = useState(goal.scope.countryCodes);

	const yearLocked = goal.isExpired;
	const allowedYears = allowedGoalYears().options;
	const yearOptions = useMemo(() => {
		if (yearLocked) {
			return [goal.year] as const;
		}
		const options = new Set<number>([...allowedYears, goal.year]);
		return [...options].sort((a, b) => a - b);
	}, [allowedYears, goal.year, yearLocked]);

	useEffect(() => {
		if (!open) {
			return;
		}
		setTitle(goal.title);
		setDescription(goal.description ?? "");
		setYear(goal.year);
		setTarget(String(goal.target));
		setScopeKind(goal.scope.kind);
		setAuthorSlugs(goal.scope.authorSlugs);
		setCountryCodes(goal.scope.countryCodes);
	}, [goal, open]);

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

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const parsedTarget = Number.parseInt(target, 10);
		if (!Number.isFinite(parsedTarget) || parsedTarget < 1) {
			toast.error("Enter a target of at least 1 book");
			return;
		}

		const payload: UpdateGoalInput = {
			goalSlug: goal.slug,
			title,
			description: description.trim() ? description.trim() : undefined,
			year,
			target: parsedTarget,
			scopeKind,
			...(scopeKind === "authors" ? { scopeAuthorSlugs: authorSlugs } : {}),
			...(scopeKind === "countries" ? { scopeCountryCodes: countryCodes } : {}),
		};

		updateMutation.mutate(payload);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit goal</DialogTitle>
					<DialogDescription>
						{yearLocked
							? "This goal is from a past year. You can update the details, but not the year."
							: "Change the target, scope, or other details. Progress still follows your reads."}
					</DialogDescription>
				</DialogHeader>

				<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
					<Field>
						<FieldLabel htmlFor={titleId}>Title</FieldLabel>
						<Input
							id={titleId}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={120}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="edit-goal-year">Year</FieldLabel>
						<select
							id="edit-goal-year"
							className="flex h-9 w-full border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
							value={year}
							disabled={yearLocked}
							onChange={(e) => setYear(Number(e.target.value))}
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
						{yearLocked ? (
							<FieldDescription>
								Expired goals keep their original year.
							</FieldDescription>
						) : (
							<FieldDescription>
								Active goals can use this year or next year.
							</FieldDescription>
						)}
					</Field>

					<Field>
						<FieldLabel htmlFor="edit-goal-target">Target (books)</FieldLabel>
						<Input
							id="edit-goal-target"
							type="number"
							min={1}
							max={10000}
							value={target}
							onChange={(e) => setTarget(e.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="edit-goal-description">
							Description (optional)
						</FieldLabel>
						<Textarea
							id="edit-goal-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={2000}
							rows={3}
						/>
					</Field>

					<ShelfOptionPicker
						name="edit-goal-scope"
						label="Scope"
						description="Limit which finished reads count, or leave all books included."
						value={scopeKind}
						options={scopeOptions}
						onChange={(value) => {
							setScopeKind(value);
							if (value !== "authors") {
								setAuthorSlugs([]);
							}
							if (value !== "countries") {
								setCountryCodes([]);
							}
						}}
					/>

					{scopeKind === "authors" ? (
						<ListingAuthorMultiSelect
							legend="Authors in scope"
							selectedSlugs={authorSlugs}
							onSelectedSlugsChange={setAuthorSlugs}
							facetInput={{}}
						/>
					) : null}

					{scopeKind === "countries" ? (
						<ListingCountryMultiSelect
							legend="Countries in scope"
							selectedAlpha2={countryCodes}
							onSelectedAlpha2Change={setCountryCodes}
							facetInput={{}}
						/>
					) : null}

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={updateMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? "Saving…" : "Save changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
