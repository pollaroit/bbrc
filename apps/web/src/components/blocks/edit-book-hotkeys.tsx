"use client";

/**
 * Keyboard hints for the edit page. The add flow has more shortcuts (switching
 * between search results, save and next), but those do nothing here, so this
 * bar and sheet list only what works: Save, Back and the list itself.
 */

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Keyboard } from "lucide-react";
import {
	type BookFlowHotkeyId,
	HotkeyChip,
} from "@/components/blocks/book-flow";
import {
	formatBookFlowHotkey,
	getBookFlowHotkey,
	useHasKeyboard,
	useIsMac,
} from "@/components/blocks/book-flow/use-book-flow-hotkeys";

const EDIT_HOTKEYS: BookFlowHotkeyId[] = ["save", "back", "help"];

const EDIT_LABELS: Record<string, { label: string; description: string }> = {
	save: { label: "Save", description: "Save your changes" },
	back: {
		label: "Back",
		description: "Leave without saving (asks first if you changed something)",
	},
	help: { label: "Shortcuts", description: "Show this list" },
};

export function EditHotkeyBar({ onOpenHelp }: { onOpenHelp: () => void }) {
	const hasKeyboard = useHasKeyboard();
	if (!hasKeyboard) return null;

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border border-border border-dashed px-3 py-2 text-muted-foreground text-xs">
			<Keyboard className="size-3.5 shrink-0" aria-hidden />
			{(["save", "back"] as const).map((id) => (
				<span key={id} className="inline-flex items-center gap-1.5">
					<HotkeyChip id={id} />
					{EDIT_LABELS[id]?.label}
				</span>
			))}
			<Button
				type="button"
				variant="ghost"
				size="xs"
				className="ms-auto h-6 gap-1.5 px-1.5 text-muted-foreground"
				onClick={onOpenHelp}
			>
				<HotkeyChip id="help" />
				All shortcuts
			</Button>
		</div>
	);
}

export function EditHotkeyHelp({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const isMac = useIsMac();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-4 sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Single keys work when you are not typing in a field. They never
						replace your browser's own shortcuts.
					</DialogDescription>
				</DialogHeader>
				<ul className="flex flex-col divide-y divide-border border border-border">
					{EDIT_HOTKEYS.map((id) => (
						<li
							key={id}
							className="flex items-center justify-between gap-3 px-3 py-2"
						>
							<span className="min-w-0 text-sm">
								{EDIT_LABELS[id]?.description ??
									getBookFlowHotkey(id).description}
							</span>
							<span className="flex shrink-0 items-center gap-0.5">
								{formatBookFlowHotkey(id, isMac).map((key) => (
									<kbd
										key={key}
										className="inline-flex h-5 min-w-5 items-center justify-center border border-border border-b-2 bg-muted/50 px-1 font-medium font-mono text-3xs leading-none"
									>
										{key}
									</kbd>
								))}
							</span>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
