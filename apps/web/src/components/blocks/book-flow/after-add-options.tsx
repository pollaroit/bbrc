"use client";

import { Switch } from "@bbrc/ui/components/switch";
import { useCallback, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * "After adding" — replaces the old "Add more" / "Request next" checkboxes.
 *
 * What happens when a book has been saved:
 *   stay          stay on the form, cleared, ready for another book
 *   keep_results  go back to the search with the same results still shown
 *   next_request  open the next pending member request (admins, add mode)
 *   open_book     go to the new book's page
 *
 * `notifyMembers` is the "Notify members" switch (add mode): off sends
 * `notifyMembers: false` to `book.addBook`, so only the people who asked for the
 * book hear about it. Both choices are remembered in this browser.
 *
 * - `useAfterAddPreferences(mode)` → `[prefs, setPrefs]`, remembered in localStorage
 * - `<AfterAddOptions mode value onChange disabledActions? />` is controlled:
 *     mode             "add" (admins) or "request" (members)
 *     value / onChange `AfterAddPreferences`
 *     disabledActions  an action → why it is unavailable (e.g. no pending requests)
 */

export type AfterAddAction =
	| "stay"
	| "keep_results"
	| "next_request"
	| "open_book";

export type AfterAddPreferences = {
	after: AfterAddAction;
	notifyMembers: boolean;
};

export type AfterAddMode = "add" | "request";

const DEFAULTS: Record<AfterAddMode, AfterAddPreferences> = {
	add: { after: "open_book", notifyMembers: true },
	request: { after: "stay", notifyMembers: true },
};

type ActionCopy = { title: string; hint: string };

const COPY: Record<
	AfterAddMode,
	Partial<Record<AfterAddAction, ActionCopy>>
> = {
	add: {
		open_book: { title: "Open the book", hint: "Go to its page." },
		stay: { title: "Add another", hint: "Clear the form and search again." },
		keep_results: {
			title: "Keep my results",
			hint: "Back to the same search results.",
		},
		next_request: {
			title: "Next request",
			hint: "Open the next pending member request.",
		},
	},
	request: {
		stay: {
			title: "Request another",
			hint: "Clear the form and search again.",
		},
		keep_results: {
			title: "Keep my results",
			hint: "Back to the same search results.",
		},
	},
};

const ORDER: AfterAddAction[] = [
	"open_book",
	"stay",
	"keep_results",
	"next_request",
];

const storageKey = (mode: AfterAddMode) =>
	`bbrc:book-flow:after-add:${mode}:v1`;

function isAction(value: unknown, mode: AfterAddMode): value is AfterAddAction {
	return typeof value === "string" && value in COPY[mode];
}

export function useAfterAddPreferences(mode: AfterAddMode) {
	const [prefs, setPrefsState] = useState<AfterAddPreferences>(DEFAULTS[mode]);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(storageKey(mode));
			if (!raw) return;
			const parsed = JSON.parse(raw) as Partial<AfterAddPreferences>;
			setPrefsState({
				after: isAction(parsed.after, mode)
					? parsed.after
					: DEFAULTS[mode].after,
				notifyMembers:
					typeof parsed.notifyMembers === "boolean"
						? parsed.notifyMembers
						: DEFAULTS[mode].notifyMembers,
			});
		} catch {
			// Blocked or corrupt storage: keep the defaults.
		}
	}, [mode]);

	const setPrefs = useCallback(
		(next: AfterAddPreferences) => {
			setPrefsState(next);
			try {
				window.localStorage.setItem(storageKey(mode), JSON.stringify(next));
			} catch {
				// Not remembered; still applies for this visit.
			}
		},
		[mode],
	);

	return [prefs, setPrefs] as const;
}

export function AfterAddOptions({
	mode,
	value,
	onChange,
	disabledActions,
	className,
}: {
	mode: AfterAddMode;
	value: AfterAddPreferences;
	onChange: (next: AfterAddPreferences) => void;
	disabledActions?: Partial<Record<AfterAddAction, string>>;
	className?: string;
}) {
	const uid = useId();
	const copy = COPY[mode];
	const actions = ORDER.filter((action) => copy[action]);
	const verb = mode === "add" ? "adding" : "requesting";

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<fieldset className="flex flex-col gap-2">
				<legend className="pb-1 font-medium text-sm">After {verb}</legend>
				<div
					className={cn(
						"grid gap-2",
						actions.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2",
					)}
				>
					{actions.map((action) => {
						const entry = copy[action] as ActionCopy;
						const disabledReason = disabledActions?.[action];
						const active = value.after === action;
						return (
							<label
								key={action}
								className={cn(
									"flex cursor-pointer flex-col gap-0.5 border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
									active
										? "border-foreground bg-muted/40"
										: "border-border hover:bg-muted/20",
									disabledReason && "cursor-not-allowed opacity-60",
								)}
							>
								<input
									type="radio"
									name={`${uid}-after`}
									value={action}
									checked={active}
									disabled={Boolean(disabledReason)}
									onChange={() => onChange({ ...value, after: action })}
									className="sr-only"
								/>
								<span className="font-medium text-sm">{entry.title}</span>
								<span className="text-muted-foreground text-xs leading-relaxed">
									{disabledReason ?? entry.hint}
								</span>
							</label>
						);
					})}
				</div>
			</fieldset>

			{mode === "add" ? (
				<div className="flex items-start justify-between gap-4 border border-border p-3">
					<label
						htmlFor={`${uid}-notify`}
						className="flex min-w-0 cursor-pointer flex-col gap-0.5"
					>
						<span className="font-medium text-sm">Notify members</span>
						<span className="text-muted-foreground text-xs leading-relaxed">
							{value.notifyMembers
								? "Everyone hears about the new book."
								: "Only the member who asked, and anyone who said “me too”, hear about it. Good for adding many books at once."}
						</span>
					</label>
					<Switch
						id={`${uid}-notify`}
						checked={value.notifyMembers}
						onCheckedChange={(checked) =>
							onChange({ ...value, notifyMembers: checked })
						}
					/>
				</div>
			) : null}
		</div>
	);
}
