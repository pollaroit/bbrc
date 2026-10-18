"use client";

import {
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared right-side listing sheet shell (books library, export, filters). */
export const listingSideSheetContentClassName =
	"flex min-h-0 w-full max-w-[100vw] flex-col gap-0 border-border bg-background p-0 sm:max-w-lg";

export function ListingSideSheetHeader({
	title,
	description,
}: {
	title: ReactNode;
	description?: ReactNode;
}) {
	return (
		<SheetHeader className="gap-2 border-border border-b px-6 py-5 text-left">
			<SheetTitle className="font-semibold text-lg tracking-tight">
				{title}
			</SheetTitle>
			{description ? (
				<SheetDescription className="text-sm leading-relaxed">
					{description}
				</SheetDescription>
			) : null}
		</SheetHeader>
	);
}

export function ListingSideSheetBody({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-6 py-5",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function ListingSideSheetFooter({ children }: { children: ReactNode }) {
	return (
		<SheetFooter className="border-border border-t bg-muted/15 px-6 py-4 sm:justify-between">
			{children}
		</SheetFooter>
	);
}

export function ListingSideSheetSection({
	title,
	description,
	children,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex flex-col gap-3 border border-border bg-muted/10 px-4 py-4",
				className,
			)}
		>
			<div className="flex flex-col gap-0.5">
				<h3 className="font-medium text-foreground text-sm">{title}</h3>
				{description ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-3">{children}</div>
		</section>
	);
}
