"use client";

import {
	DEFAULT_RATING_DEFINITIONS,
	formatFeedbackRating,
	RATING_DEFINITION_MAX_LENGTH,
	RATING_DEFINITION_STEPS,
	ratingKey,
	resolveRatingDefinition,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PreferencesSection } from "@/components/blocks/preferences-ui";
import { MiniStars } from "@/components/blocks/rating-definition-card";
import { useRatingDefinitions } from "@/lib/rating/use-rating-definitions";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type Overrides = Record<string, string>;

/** Saves or resets one rating's wording; the list updates at once and rolls back on a failure. */
function useRatingDefinitionMutations(queryKey: readonly unknown[]) {
	const patch = (rating: number, text: string | null) => {
		const previous = queryClient.getQueryData<{ overrides: Overrides }>(
			queryKey,
		);
		const next = { ...(previous?.overrides ?? {}) };
		if (text == null) delete next[ratingKey(rating)];
		else next[ratingKey(rating)] = text;
		queryClient.setQueryData(queryKey, { overrides: next });
		return { previous };
	};
	const rollback = (context?: {
		previous?: { overrides: Overrides } | undefined;
	}) => {
		queryClient.setQueryData(queryKey, context?.previous);
		toast.error("Could not save that. Try again.");
	};
	const settle = () => void queryClient.invalidateQueries({ queryKey });

	const set = useMutation(
		orpc.ratingDefinition.set.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey });
				return patch(variables.rating, variables.text);
			},
			onError: (_error, _variables, context) => rollback(context),
			onSettled: settle,
		}),
	);
	const reset = useMutation(
		orpc.ratingDefinition.reset.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey });
				return patch(variables.rating, null);
			},
			onError: (_error, _variables, context) => rollback(context),
			onSettled: settle,
		}),
	);
	return { set, reset };
}

function EditDialog({
	rating,
	text,
	custom,
	open,
	onOpenChange,
	onSave,
	onReset,
}: {
	rating: (typeof RATING_DEFINITION_STEPS)[number];
	text: string;
	custom: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (text: string) => void;
	onReset: () => void;
}) {
	const [draft, setDraft] = useState(text);
	const label = DEFAULT_RATING_DEFINITIONS[ratingKey(rating)]?.label ?? "";
	const trimmed = draft.trim();
	const changed = trimmed !== text.trim();

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) setDraft(text);
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{formatFeedbackRating(rating)} stars: {label}
					</DialogTitle>
					<DialogDescription>
						Write what this rating means to you. You will see it when you rate,
						so your ratings stay consistent.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-1.5">
					<Textarea
						value={draft}
						onChange={(event) =>
							setDraft(
								event.target.value.slice(0, RATING_DEFINITION_MAX_LENGTH),
							)
						}
						rows={7}
						autoFocus
						aria-label={`What ${formatFeedbackRating(rating)} stars means to you`}
					/>
					<p className="text-end text-muted-foreground text-xs tabular-nums">
						{draft.length} / {RATING_DEFINITION_MAX_LENGTH}
					</p>
				</div>
				<DialogFooter className="gap-2 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						disabled={!custom && !changed}
						onClick={() => {
							onReset();
							onOpenChange(false);
						}}
					>
						<RotateCcw data-icon="inline-start" aria-hidden />
						Reset to default
					</Button>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!trimmed || !changed}
							onClick={() => {
								onSave(trimmed);
								onOpenChange(false);
							}}
						>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Row({
	rating,
	signedIn,
	overrides,
	onSave,
	onReset,
}: {
	rating: (typeof RATING_DEFINITION_STEPS)[number];
	signedIn: boolean;
	overrides: Overrides;
	onSave: (rating: number, text: string) => void;
	onReset: (rating: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const definition = resolveRatingDefinition(rating, overrides);

	return (
		<li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
					<MiniStars rating={rating} />
					<span className="font-semibold">{definition.label}</span>
					{definition.custom ? (
						<span className="border border-border px-1 text-2xs text-muted-foreground">
							Your wording
						</span>
					) : null}
				</p>
				<p
					className={cn(
						"line-clamp-3 text-muted-foreground text-sm leading-relaxed",
					)}
				>
					{definition.text}
				</p>
			</div>
			{signedIn ? (
				<div className="flex shrink-0 gap-1.5">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
					>
						Edit
					</Button>
					{definition.custom ? (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => onReset(rating)}
							aria-label={`Reset ${formatFeedbackRating(rating)} stars to the default`}
							title="Reset to default"
						>
							<RotateCcw data-icon="inline-start" aria-hidden />
							Reset
						</Button>
					) : null}
				</div>
			) : null}
			{open ? (
				<EditDialog
					rating={rating}
					text={definition.text}
					custom={definition.custom}
					open={open}
					onOpenChange={setOpen}
					onSave={(text) => onSave(rating, text)}
					onReset={() => onReset(rating)}
				/>
			) : null}
		</li>
	);
}

/** Preferences: what each rating means to this member (the default text until they change it). */
export function RatingDefinitionsSection() {
	const { signedIn, overrides, queryKey } = useRatingDefinitions();
	const { set, reset } = useRatingDefinitionMutations(queryKey);

	return (
		<PreferencesSection
			id="ratings"
			title="Rating definitions"
			description={
				signedIn
					? "What each rating means to you. These are shown when you rate, so you can judge every book by the same yardstick. Change any of them, or reset one to the default."
					: "What each rating means. Sign in to write your own wording for any of them."
			}
		>
			<ol className="flex flex-col divide-y divide-border">
				{RATING_DEFINITION_STEPS.map((rating) => (
					<Row
						key={rating}
						rating={rating}
						signedIn={signedIn}
						overrides={overrides}
						onSave={(value, text) => set.mutate({ rating: value, text })}
						onReset={(value) => reset.mutate({ rating: value })}
					/>
				))}
			</ol>
		</PreferencesSection>
	);
}
