"use client";

import {
	defaultRatingDefinition,
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
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PreferencesSection } from "@/components/blocks/preferences-ui";
import { MiniStars } from "@/components/blocks/rating-guide";
import { useRatingDefinitions } from "@/lib/rating/use-rating-definitions";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type Overrides = Record<string, string>;

/** Saves or resets one rating's wording; the list updates at once and rolls back on a failure. */
function useRatingDefinitionMutations(queryKey: readonly unknown[]) {
	const t = useTranslations("preferences.ratingsEditor");
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
		toast.error(t("saveFailed"));
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
	const t = useTranslations("preferences.ratingsEditor");
	const [draft, setDraft] = useState(text);
	const locale = useLocale();
	const label = defaultRatingDefinition(rating, locale).label;
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
						{t("dialogTitle", { rating: formatFeedbackRating(rating), label })}
					</DialogTitle>
					<DialogDescription>{t("dialogDescription")}</DialogDescription>
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
						aria-label={t("textareaLabel", {
							rating: formatFeedbackRating(rating),
						})}
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
						{t("resetToDefault")}
					</Button>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t("cancel")}
						</Button>
						<Button
							type="button"
							disabled={!trimmed || !changed}
							onClick={() => {
								onSave(trimmed);
								onOpenChange(false);
							}}
						>
							{t("save")}
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
	const t = useTranslations("preferences.ratingsEditor");
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const definition = resolveRatingDefinition(rating, overrides, locale);

	return (
		<li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
					<MiniStars rating={rating} />
					<span className="font-semibold">{definition.label}</span>
					{definition.custom ? (
						<span className="border border-border px-1 text-2xs text-muted-foreground">
							{t("yourWording")}
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
						{t("edit")}
					</Button>
					{definition.custom ? (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => onReset(rating)}
							aria-label={t("resetLabel", {
								rating: formatFeedbackRating(rating),
							})}
							title={t("resetToDefault")}
						>
							<RotateCcw data-icon="inline-start" aria-hidden />
							{t("reset")}
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
	const t = useTranslations("preferences.ratingsEditor");
	const { signedIn, overrides, queryKey } = useRatingDefinitions();
	const { set, reset } = useRatingDefinitionMutations(queryKey);

	return (
		<PreferencesSection
			id="ratings"
			title={t("title")}
			description={
				signedIn ? t("descriptionSignedIn") : t("descriptionSignedOut")
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
