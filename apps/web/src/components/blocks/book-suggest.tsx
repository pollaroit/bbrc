"use client";

/**
 * "Suggest" helpers for the add and edit forms. Nothing is filled in on its own:
 * the draft shows in a small popover and only an explicit Accept applies it.
 *
 * `SuggestExcerptButton`
 *   props: `{ title, authors, publishedIn?, excerpt?, onAccept(text: string) }`
 *   Accept replaces the description with the draft.
 * `SuggestSubjectsButton`
 *   props: `{ title, authors, publishedIn?, excerpt?, subjects: string[], onAccept(subjects: string[]) }`
 *   Accept merges the picked tags into the current ones (no duplicates).
 *
 * Both are admin-only features on the server. When AI is not set up
 * (PRECONDITION_FAILED) the button turns off with a tooltip instead of failing again.
 */

import type { SuggestBookDetailsOutput } from "@bbrc/api/modules/book/book-assist.schema";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { orpc } from "@/utils/orpc";

type SuggestBase = {
	title: string;
	authors: string[];
	publishedIn?: number;
	/** What the form already has, so the draft builds on it. */
	excerpt?: string;
	className?: string;
};

const NOT_SET_UP = "AI suggestions are not set up on this server.";

function useSuggestion(base: SuggestBase) {
	const [open, setOpen] = useState(false);
	const [unavailable, setUnavailable] = useState(false);
	const mutation = useMutation(
		orpc.book.suggestDetails.mutationOptions({
			onError: (error) => {
				if ((error as { code?: string }).code === "PRECONDITION_FAILED") {
					setUnavailable(true);
					setOpen(false);
				}
			},
		}),
	);
	const canAsk = base.title.trim().length > 0;

	function ask() {
		setOpen(true);
		if (mutation.isPending) return;
		mutation.mutate({
			title: base.title.trim(),
			authors: base.authors,
			publishedIn: base.publishedIn,
			excerpt: base.excerpt?.trim() || undefined,
		});
	}

	return { open, setOpen, unavailable, mutation, canAsk, ask };
}

function Trigger({
	label,
	unavailable,
	disabled,
	pending,
	onAsk,
	className,
}: {
	label: string;
	unavailable: boolean;
	disabled: boolean;
	pending: boolean;
	onAsk: () => void;
	className?: string;
}) {
	return (
		<PopoverTrigger
			render={
				<Button
					type="button"
					variant="outline"
					size="xs"
					className={className}
					disabled={disabled || unavailable}
					title={unavailable ? NOT_SET_UP : undefined}
					onClick={onAsk}
				/>
			}
		>
			{pending ? (
				<Loader2 data-icon="inline-start" className="animate-spin" />
			) : (
				<Sparkles data-icon="inline-start" />
			)}
			{label}
		</PopoverTrigger>
	);
}

function DraftState({
	pending,
	error,
	empty,
	children,
}: {
	pending: boolean;
	error: Error | null;
	empty: boolean;
	children: React.ReactNode;
}) {
	if (pending) {
		return (
			<p className="flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" aria-hidden />
				Thinking…
			</p>
		);
	}
	if (error) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{error.message}
			</p>
		);
	}
	if (empty) {
		return (
			<p className="text-muted-foreground text-sm">
				Nothing reliable to suggest for this book. Fill it in by hand.
			</p>
		);
	}
	return <>{children}</>;
}

export function SuggestExcerptButton({
	onAccept,
	...base
}: SuggestBase & { onAccept: (text: string) => void }) {
	const { open, setOpen, unavailable, mutation, canAsk, ask } =
		useSuggestion(base);
	const draft: SuggestBookDetailsOutput | undefined = mutation.data;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Trigger
				label="Suggest a description"
				unavailable={unavailable}
				disabled={!canAsk}
				pending={mutation.isPending}
				onAsk={ask}
				className={base.className}
			/>
			<PopoverContent align="start" className="flex w-80 flex-col gap-3">
				<DraftState
					pending={mutation.isPending}
					error={mutation.error}
					empty={!draft?.excerpt}
				>
					<p className="font-medium text-sm">Suggested description</p>
					<p className="max-h-48 overflow-y-auto text-pretty text-sm leading-relaxed">
						{draft?.excerpt}
					</p>
					<p className="text-muted-foreground text-xs">
						Written by AI. Check it before you keep it.
					</p>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setOpen(false)}
						>
							Discard
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => {
								if (draft?.excerpt) onAccept(draft.excerpt);
								setOpen(false);
							}}
						>
							Use it
						</Button>
					</div>
				</DraftState>
			</PopoverContent>
		</Popover>
	);
}

export function SuggestSubjectsButton({
	subjects,
	onAccept,
	...base
}: SuggestBase & {
	subjects: string[];
	onAccept: (subjects: string[]) => void;
}) {
	const uid = useId();
	const { open, setOpen, unavailable, mutation, canAsk, ask } =
		useSuggestion(base);
	const [skipped, setSkipped] = useState<Set<string>>(new Set());
	const draft = mutation.data;
	const have = new Set(subjects.map((subject) => subject.toLowerCase()));
	const fresh = (draft?.subjects ?? []).filter(
		(subject) => !have.has(subject.toLowerCase()),
	);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setSkipped(new Set());
			}}
		>
			<Trigger
				label="Suggest subjects"
				unavailable={unavailable}
				disabled={!canAsk}
				pending={mutation.isPending}
				onAsk={ask}
				className={base.className}
			/>
			<PopoverContent align="start" className="flex w-80 flex-col gap-3">
				<DraftState
					pending={mutation.isPending}
					error={mutation.error}
					empty={fresh.length === 0}
				>
					<p className="font-medium text-sm">Suggested subjects</p>
					<ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
						{fresh.map((subject, index) => (
							<li key={subject}>
								<label
									htmlFor={`${uid}-${index}`}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										id={`${uid}-${index}`}
										checked={!skipped.has(subject)}
										onCheckedChange={(checked) =>
											setSkipped((current) => {
												const next = new Set(current);
												if (checked === true) next.delete(subject);
												else next.add(subject);
												return next;
											})
										}
									/>
									{subject}
								</label>
							</li>
						))}
					</ul>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setOpen(false)}
						>
							Discard
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => {
								const picked = fresh.filter((subject) => !skipped.has(subject));
								if (picked.length > 0) onAccept([...subjects, ...picked]);
								setOpen(false);
							}}
						>
							Add the picked ones
						</Button>
					</div>
				</DraftState>
			</PopoverContent>
		</Popover>
	);
}
