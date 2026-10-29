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
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
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
					<AlertDialogAction onClick={onConfirm}>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
