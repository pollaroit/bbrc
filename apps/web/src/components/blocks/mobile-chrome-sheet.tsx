"use client";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const mobileChromeSheetContentClass =
	"gap-0 px-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg";

export function MobileChromeSheetHandle() {
	return <div className="mx-auto mb-3 h-1 w-12 bg-border" aria-hidden="true" />;
}

type MobileChromeSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
	/** Accessible title; visible title can differ via header slot. */
	title: string;
};

export function MobileChromeSheet({
	open,
	onOpenChange,
	children,
	title,
}: MobileChromeSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className={mobileChromeSheetContentClass}
			>
				<SheetTitle className="sr-only">{title}</SheetTitle>
				<MobileChromeSheetHandle />
				{children}
			</SheetContent>
		</Sheet>
	);
}

type MobileChromeSheetIntroProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	className?: string;
};

export function MobileChromeSheetIntro({
	icon: Icon,
	title,
	description,
	className,
}: MobileChromeSheetIntroProps) {
	return (
		<SheetHeader
			className={cn(
				"gap-1 border-border border-b px-4 pb-4 text-left",
				className,
			)}
		>
			<p className="flex items-center gap-2 font-semibold text-base tracking-tight">
				<span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/30">
					<Icon className="size-4" aria-hidden />
				</span>
				{title}
			</p>
			<p className="text-pretty ps-10 text-muted-foreground text-sm leading-snug">
				{description}
			</p>
		</SheetHeader>
	);
}

export function MobileChromeSheetSection({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col", className)}>
			<h3 className="px-4 pt-3 pb-1 font-medium text-muted-foreground text-xs">
				{title}
			</h3>
			{children}
		</section>
	);
}

export const mobileSheetRowClass =
	"flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function MobileSheetRowIcon({ icon: Icon }: { icon: LucideIcon }) {
	return (
		<span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/20">
			<Icon className="size-4 text-foreground" aria-hidden />
		</span>
	);
}

export function MobileSheetRowBody({
	label,
	description,
}: {
	label: string;
	description?: string;
}) {
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="font-medium leading-snug">{label}</span>
			{description ? (
				<span className="text-pretty text-muted-foreground text-xs leading-snug">
					{description}
				</span>
			) : null}
		</span>
	);
}
