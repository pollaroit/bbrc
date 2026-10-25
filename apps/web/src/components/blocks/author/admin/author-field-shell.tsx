"use client";

import { AUTHOR_FIELD_SOURCE_LABELS, type AuthorFieldMeta } from "@bbrc/shared";
import {
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@bbrc/ui/components/field";
import { Lock, LockOpen } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LockableField = keyof AuthorFieldMeta;

/**
 * One editable field with where its value came from ("From Wikipedia") and a lock.
 * A locked field is never overwritten by a refresh or by the background pipeline.
 */
export function AuthorFieldShell({
	label,
	htmlFor,
	field,
	meta,
	onToggleLock,
	description,
	error,
	children,
	className,
}: {
	label: string;
	htmlFor?: string;
	field?: LockableField;
	meta?: AuthorFieldMeta;
	onToggleLock?: (field: LockableField, locked: boolean) => void;
	description?: ReactNode;
	error?: string;
	children: ReactNode;
	className?: string;
}) {
	const entry = field ? meta?.[field] : undefined;
	const locked = entry?.locked === true;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2">
					<FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
					{entry ? (
						<span className="text-muted-foreground text-xs">
							{AUTHOR_FIELD_SOURCE_LABELS[entry.source]}
						</span>
					) : null}
				</div>
				{field && onToggleLock ? (
					<button
						type="button"
						aria-pressed={locked}
						onClick={() => onToggleLock(field, !locked)}
						className={cn(
							"inline-flex items-center gap-1 px-1.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							locked
								? "bg-warning/10 text-warning-ink"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
						title={
							locked
								? "Locked: refreshes will not change this. Click to unlock."
								: "Lock this so refreshes never change it."
						}
					>
						{locked ? (
							<Lock className="size-3" aria-hidden />
						) : (
							<LockOpen className="size-3" aria-hidden />
						)}
						{locked ? "Locked" : "Lock"}
					</button>
				) : null}
			</div>
			{children}
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			{error ? <FieldError>{error}</FieldError> : null}
		</div>
	);
}
