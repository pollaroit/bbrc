"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import type { ReactNode } from "react";

/** A plain "are you sure" for things that matter but are not destructive (ending a session, leaving). */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Keep reading",
	onConfirm,
	secondaryLabel,
	onSecondary,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
	/** A third choice between cancelling and confirming (for example "Pause and leave"). */
	secondaryLabel?: string;
	onSecondary?: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
					{secondaryLabel && onSecondary ? (
						<AlertDialogAction
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								onSecondary();
							}}
						>
							{secondaryLabel}
						</AlertDialogAction>
					) : null}
					<AlertDialogAction
						onClick={() => {
							// The action button does not close the dialog by itself.
							onOpenChange(false);
							onConfirm();
						}}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
