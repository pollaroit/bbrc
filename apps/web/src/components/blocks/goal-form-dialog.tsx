"use client";

import type { CreateGoalInput } from "@bbrc/api/modules/goal/goal.schema";
import type { Visibility } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { BookOpen, Globe, Minus, PenLine, Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ShelfOptionPicker } from "@/components/blocks/shelf-form-options";
import { VisibilitySelect } from "@/components/blocks/visibility-select";
import { ListingAuthorMultiSelect } from "@/components/listing/listing-author-multi-select";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { cn } from "@/lib/utils";

export type GoalFormValues = {
	title: string;
	description: string;
	year: number;
	target: number;
	scopeKind: CreateGoalInput["scopeKind"];
	authorSlugs: string[];
	countryCodes: string[];
	/** Left out when the current level is not known: the selector is hidden and nothing is sent. */
	visibility?: Visibility;
};

type GoalFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	heading: string;
	blurb: string;
	submitLabel: string;
	pending: boolean;
	initial: GoalFormValues;
	/** Years the member can choose between. */
	yearOptions: readonly number[];
	yearLocked?: boolean;
	onSubmit: (values: GoalFormValues) => void;
};

const iconClass = "size-4 text-muted-foreground";

const scopeOptions = [
	{
		value: "none" as const,
		title: "All books",
		description: "Every finished read that year counts.",
		icon: <BookOpen className={iconClass} aria-hidden />,
	},
	{
		value: "authors" as const,
		title: "By author",
		description: "Only books by the authors you pick.",
		icon: <PenLine className={iconClass} aria-hidden />,
	},
	{
		value: "countries" as const,
		title: "By country",
		description: "Only books from the countries you pick.",
		icon: <Globe className={iconClass} aria-hidden />,
	},
];

const TARGET_PRESETS = [6, 12, 24, 52] as const;
const MAX_TARGET = 10_000;

function describeGoal(values: GoalFormValues) {
	const books = `${values.target} ${values.target === 1 ? "book" : "books"}`;
	const scope =
		values.scopeKind === "authors"
			? values.authorSlugs.length > 0
				? ` by ${values.authorSlugs.length} chosen ${values.authorSlugs.length === 1 ? "author" : "authors"}`
				: " by chosen authors"
			: values.scopeKind === "countries"
				? values.countryCodes.length > 0
					? ` from ${values.countryCodes.length} chosen ${values.countryCodes.length === 1 ? "country" : "countries"}`
					: " from chosen countries"
				: "";
	return `Finish ${books}${scope} in ${values.year}.`;
}

/** Shared create/edit form for reading goals. */
export function GoalFormDialog({
	open,
	onOpenChange,
	heading,
	blurb,
	submitLabel,
	pending,
	initial,
	yearOptions,
	yearLocked = false,
	onSubmit,
}: GoalFormDialogProps) {
	const titleId = useId();
	const targetId = useId();
	const descriptionId = useId();
	const [values, setValues] = useState<GoalFormValues>(initial);

	function patch(next: Partial<GoalFormValues>) {
		setValues((current) => ({ ...current, ...next }));
	}

	function setTarget(next: number) {
		patch({ target: Math.min(MAX_TARGET, Math.max(1, Math.round(next) || 1)) });
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(92dvh,760px)] gap-5 overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{heading}</DialogTitle>
					<DialogDescription>{blurb}</DialogDescription>
				</DialogHeader>

				<form
					className="flex flex-col gap-5"
					onSubmit={(event) => {
						event.preventDefault();
						if (!values.title.trim()) {
							toast.error("Give your goal a title");
							return;
						}
						onSubmit({ ...values, title: values.title.trim() });
					}}
				>
					<Field>
						<FieldLabel htmlFor={titleId}>Title</FieldLabel>
						<Input
							id={titleId}
							value={values.title}
							onChange={(e) => patch({ title: e.target.value })}
							placeholder={`${values.year} reading challenge`}
							maxLength={120}
							autoComplete="off"
							required
						/>
					</Field>

					<fieldset className="flex flex-col gap-2">
						<legend className="font-medium text-sm">Year</legend>
						<div className="grid grid-cols-2 gap-2">
							{yearOptions.map((year) => (
								<label
									key={year}
									className={cn(
										"flex cursor-pointer items-center justify-center border p-2.5 font-medium text-sm tabular-nums transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
										values.year === year
											? "border-foreground bg-muted/30"
											: "border-border hover:bg-muted/40",
										yearLocked && "cursor-not-allowed opacity-60",
									)}
								>
									<input
										type="radio"
										name="goal-year"
										value={year}
										checked={values.year === year}
										disabled={yearLocked}
										onChange={() => patch({ year })}
										className="sr-only"
									/>
									{year}
								</label>
							))}
						</div>
						<p className="text-muted-foreground text-xs">
							{yearLocked
								? "Expired goals keep their original year."
								: "Goals can be set for this year or next."}
						</p>
					</fieldset>

					<div className="flex flex-col gap-2">
						<FieldLabel htmlFor={targetId}>How many books?</FieldLabel>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="Fewer books"
								disabled={values.target <= 1}
								onClick={() => setTarget(values.target - 1)}
							>
								<Minus aria-hidden />
							</Button>
							<Input
								id={targetId}
								type="number"
								inputMode="numeric"
								min={1}
								max={MAX_TARGET}
								value={values.target}
								onChange={(e) => setTarget(Number(e.target.value))}
								className="min-w-0 flex-1 text-center tabular-nums"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="More books"
								disabled={values.target >= MAX_TARGET}
								onClick={() => setTarget(values.target + 1)}
							>
								<Plus aria-hidden />
							</Button>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{TARGET_PRESETS.map((preset) => (
								<button
									key={preset}
									type="button"
									aria-pressed={values.target === preset}
									onClick={() => setTarget(preset)}
									className={cn(
										"border px-2.5 py-1 text-xs tabular-nums transition-colors",
										values.target === preset
											? "border-foreground bg-muted/30"
											: "border-border hover:bg-muted/40",
									)}
								>
									{preset}
								</button>
							))}
						</div>
					</div>

					<Field>
						<FieldLabel htmlFor={descriptionId}>
							Description{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</FieldLabel>
						<Textarea
							id={descriptionId}
							value={values.description}
							onChange={(e) => patch({ description: e.target.value })}
							maxLength={2000}
							rows={3}
							placeholder="Why this goal? A sentence is enough."
							className="resize-y"
						/>
					</Field>

					{values.visibility ? (
						<Field>
							<FieldLabel>Who can see it</FieldLabel>
							<VisibilitySelect
								value={values.visibility}
								onChange={(visibility) => patch({ visibility })}
								disabled={pending}
								label="Who can see this goal"
								className="w-fit"
							/>
						</Field>
					) : null}

					<ShelfOptionPicker
						name="goal-scope"
						label="What counts?"
						value={values.scopeKind}
						options={scopeOptions}
						columns={3}
						onChange={(scopeKind) => {
							patch({
								scopeKind,
								authorSlugs: scopeKind === "authors" ? values.authorSlugs : [],
								countryCodes:
									scopeKind === "countries" ? values.countryCodes : [],
							});
						}}
					/>

					{values.scopeKind === "authors" ? (
						<ListingAuthorMultiSelect
							legend="Authors in scope"
							selectedSlugs={values.authorSlugs}
							onSelectedSlugsChange={(authorSlugs) => patch({ authorSlugs })}
							facetInput={{}}
						/>
					) : null}

					{values.scopeKind === "countries" ? (
						<ListingCountryMultiSelect
							legend="Countries in scope"
							selectedAlpha2={values.countryCodes}
							onSelectedAlpha2Change={(countryCodes) => patch({ countryCodes })}
							facetInput={{}}
						/>
					) : null}

					<p className="border border-border bg-muted/30 px-3 py-2.5 text-sm">
						{describeGoal(values)}{" "}
						<span className="text-muted-foreground">
							Progress includes reads you already logged for that year.
						</span>
					</p>

					<div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={pending}
						>
							Cancel
						</Button>
						<LoadingButton type="submit" loading={pending}>
							{submitLabel}
						</LoadingButton>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
