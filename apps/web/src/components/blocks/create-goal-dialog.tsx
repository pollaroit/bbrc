"use client";

import type { CreateGoalInput } from "@bbrc/api/modules/goal/goal.schema";
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
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
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

type CreateGoalDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	allowedYears: [number, number];
};

type ScopeKind = CreateGoalInput["scopeKind"];

export function CreateGoalDialog({
	open,
	onOpenChange,
	username,
	allowedYears,
}: CreateGoalDialogProps) {
	const router = useRouter();
	const titleId = useId();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [year, setYear] = useState<number>(allowedYears[0]);
	const [target, setTarget] = useState("12");
	const [scopeKind, setScopeKind] = useState<ScopeKind>("none");
	const [authorSlugs, setAuthorSlugs] = useState<string[]>([]);
	const [countryCodes, setCountryCodes] = useState<string[]>([]);

	const yearOptions = useMemo(
		() => [allowedYears[0], allowedYears[1]] as const,
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
				setTitle("");
				setDescription("");
				setTarget("12");
				setScopeKind("none");
				setAuthorSlugs([]);
				setCountryCodes([]);
				router.push(`/users/${username}/goals/${data.slug}` as Route);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not create goal");
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

		const payload: CreateGoalInput = {
			title,
			description: description.trim() ? description.trim() : undefined,
			year,
			target: parsedTarget,
			scopeKind,
			...(scopeKind === "authors" ? { scopeAuthorSlugs: authorSlugs } : {}),
			...(scopeKind === "countries" ? { scopeCountryCodes: countryCodes } : {}),
		};

		createMutation.mutate(payload);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>New reading goal</DialogTitle>
					<DialogDescription>
						Set a book count for {allowedYears[0]} or {allowedYears[1]}.
						Progress includes reads you already logged for that year.
					</DialogDescription>
				</DialogHeader>

				<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
					<Field>
						<FieldLabel htmlFor={titleId}>Title</FieldLabel>
						<Input
							id={titleId}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="2026 reading challenge"
							maxLength={120}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="goal-year">Year</FieldLabel>
						<select
							id="goal-year"
							className="flex h-9 w-full border border-input bg-background px-3 text-sm"
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
						<FieldDescription>
							You can only create goals for this year or next year.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="goal-target">Target (books)</FieldLabel>
						<Input
							id="goal-target"
							type="number"
							min={1}
							max={10000}
							value={target}
							onChange={(e) => setTarget(e.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="goal-description">
							Description (optional)
						</FieldLabel>
						<Textarea
							id="goal-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={2000}
							rows={3}
						/>
					</Field>

					<ShelfOptionPicker
						name="goal-scope"
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
							disabled={createMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Creating…" : "Create goal"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
