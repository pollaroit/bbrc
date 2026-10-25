"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Keyboard } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
	BOOK_FLOW_HOTKEYS,
	type BookFlowHotkeyId,
	type BookFlowStage,
	formatBookFlowHotkey,
	hotkeysForStage,
	useHasKeyboard,
	useIsMac,
} from "./use-book-flow-hotkeys";

/*
 * Keyboard hints for the book flow.
 *
 * - `HotkeyChip`     one shortcut as key caps, e.g. <HotkeyChip id="save" /> → [Ctrl][↵]
 *                    Renders nothing on touch devices.
 * - `HotkeyHintBar`  slim line of the shortcuts that matter for the current
 *                    `stage`, with a button that opens the full list.
 * - `HotkeyHelpDialog` the cheat sheet (controlled: `open`, `onOpenChange`).
 */

function KeyCap({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center border border-border border-b-2 bg-muted/50 px-1 font-medium font-mono text-3xs text-foreground leading-none">
			{children}
		</kbd>
	);
}

export function HotkeyChip({
	id,
	className,
}: {
	id: BookFlowHotkeyId;
	className?: string;
}) {
	const isMac = useIsMac();
	const hasKeyboard = useHasKeyboard();
	if (!hasKeyboard) return null;

	return (
		<span
			className={cn("inline-flex items-center gap-0.5", className)}
			aria-hidden
		>
			{formatBookFlowHotkey(id, isMac).map((key) => (
				<KeyCap key={key}>{key}</KeyCap>
			))}
		</span>
	);
}

/** Which shortcuts the hint bar shows for each stage (the rest are in the full list). */
const HINTS: Record<BookFlowStage, BookFlowHotkeyId[]> = {
	finder: ["focusSearch", "moveDown", "pick"],
	form: ["previousBook", "save", "saveNext", "back"],
};

export function HotkeyHintBar({
	stage,
	onOpenHelp,
	className,
}: {
	stage: BookFlowStage;
	onOpenHelp: () => void;
	className?: string;
}) {
	const isMac = useIsMac();
	const hasKeyboard = useHasKeyboard();
	if (!hasKeyboard) return null;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-4 gap-y-1.5 border border-border border-dashed px-3 py-2 text-muted-foreground text-xs",
				className,
			)}
		>
			<Keyboard className="size-3.5 shrink-0" aria-hidden />
			{HINTS[stage].map((id) => {
				const hotkey = BOOK_FLOW_HOTKEYS.find((entry) => entry.id === id);
				return (
					<span key={id} className="inline-flex items-center gap-1.5">
						<span className="inline-flex items-center gap-0.5">
							{formatBookFlowHotkey(id, isMac).map((key) => (
								<KeyCap key={key}>{key}</KeyCap>
							))}
						</span>
						{hotkey?.label}
					</span>
				);
			})}
			<Button
				type="button"
				variant="ghost"
				size="xs"
				className="ms-auto h-6 gap-1.5 px-1.5 text-muted-foreground"
				onClick={onOpenHelp}
			>
				<KeyCap>?</KeyCap>
				All shortcuts
			</Button>
		</div>
	);
}

const STAGE_TITLES: Record<BookFlowStage, string> = {
	finder: "While searching",
	form: "While filling in a book",
};

export function HotkeyHelpDialog({
	open,
	onOpenChange,
	stage,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stage: BookFlowStage;
}) {
	const isMac = useIsMac();
	// The current stage first, then the other one.
	const stages: BookFlowStage[] =
		stage === "finder" ? ["finder", "form"] : ["form", "finder"];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Single keys work when you are not typing in a field. They never
						replace your browser's own shortcuts.
					</DialogDescription>
				</DialogHeader>
				{stages.map((entryStage) => (
					<section key={entryStage} className="flex flex-col gap-2">
						<h3 className="font-medium text-sm">{STAGE_TITLES[entryStage]}</h3>
						<ul className="flex flex-col divide-y divide-border border border-border">
							{hotkeysForStage(entryStage)
								.filter(
									(hotkey) =>
										hotkey.stage === entryStage ||
										(hotkey.stage === "anywhere" && entryStage === stage),
								)
								.map((hotkey) => (
									<li
										key={hotkey.id}
										className="flex items-center justify-between gap-3 px-3 py-2"
									>
										<span className="min-w-0 text-sm">
											{hotkey.description}
										</span>
										<span className="flex shrink-0 items-center gap-0.5">
											{formatBookFlowHotkey(hotkey.id, isMac).map((key) => (
												<KeyCap key={key}>{key}</KeyCap>
											))}
										</span>
									</li>
								))}
						</ul>
					</section>
				))}
			</DialogContent>
		</Dialog>
	);
}
