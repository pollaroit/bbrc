"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import type { ReactNode } from "react";

type DestructiveConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
	loading?: boolean;
	confirmDisabled?: boolean;
	children?: ReactNode;
	contentClassName?: string;
};

export function DestructiveConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	onConfirm,
	loading = false,
	confirmDisabled = false,
	children,
	contentClassName,
}: DestructiveConfirmDialogProps) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (loading) return;
				onOpenChange(next);
			}}
		>
			<AlertDialogContent className={contentClassName}>
				<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{children}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>
						{cancelLabel}
					</AlertDialogCancel>
					<LoadingButton
						type="button"
						variant="destructive"
						loading={loading}
						disabled={confirmDisabled}
						onClick={onConfirm}
					>
						{confirmLabel}
					</LoadingButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
