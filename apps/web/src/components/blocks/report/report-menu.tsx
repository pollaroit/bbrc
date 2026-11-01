"use client";

import type { ReportTargetKind } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Flag, MoreHorizontal } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	RemoveMyMentionMenuItem,
	useRemoveMyMentionAction,
} from "@/components/blocks/mention/remove-my-mention";
import { ReportDialog } from "@/components/blocks/report/report-dialog";
import { authClient } from "@/lib/auth-client";

/**
 * The "Report" item for a menu, and its dialog. Available to signed-in members
 * for anything that is not their own; the server still decides what they may
 * report (only what they can see) and refuses self-reports.
 */
export function useReportAction({
	target,
	reference,
	ownerUsername,
}: {
	target: ReportTargetKind;
	reference: string;
	ownerUsername: string;
}) {
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const user = session?.user;
	const available = Boolean(user) && user?.username !== ownerUsername;

	const dialog: ReactNode = available ? (
		<ReportDialog
			open={open}
			onOpenChange={setOpen}
			target={target}
			reference={reference}
		/>
	) : null;

	return { available, request: () => setOpen(true), dialog };
}

export function ReportMenuItem({ onSelect }: { onSelect: () => void }) {
	return (
		<DropdownMenuItem onClick={onSelect}>
			<Flag aria-hidden />
			Report
		</DropdownMenuItem>
	);
}

function MoreButton({
	label,
	className,
}: {
	label: string;
	className?: string;
}) {
	return (
		<DropdownMenuTrigger
			render={
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className={className ?? "text-muted-foreground"}
					aria-label={label}
				/>
			}
		>
			<MoreHorizontal className="size-4" aria-hidden />
		</DropdownMenuTrigger>
	);
}

/**
 * A "…" menu for someone else's post, comment or review: "Remove my mention"
 * when the viewer was mentioned, and "Report". Renders nothing when neither applies.
 */
export function ContentActionsMenu({
	kind,
	slug,
	ownerUsername,
	className,
}: {
	kind: "post" | "comment" | "review";
	slug: string;
	ownerUsername: string;
	className?: string;
}) {
	const mention = useRemoveMyMentionAction(kind, slug);
	const report = useReportAction({
		target: kind,
		reference: slug,
		ownerUsername,
	});
	if (!mention.available && !report.available) return null;

	return (
		<>
			<DropdownMenu>
				<MoreButton label={`Options for this ${kind}`} className={className} />
				<DropdownMenuContent align="end" className="min-w-44">
					{mention.available ? (
						<RemoveMyMentionMenuItem onSelect={mention.request} />
					) : null}
					{report.available ? (
						<ReportMenuItem onSelect={report.request} />
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
			{mention.dialog}
			{report.dialog}
		</>
	);
}

/** The same menu for a shelf or a profile, which have no mentions. */
export function ReportOnlyMenu({
	target,
	reference,
	ownerUsername,
	label,
	className,
}: {
	target: "shelf" | "user";
	reference: string;
	ownerUsername: string;
	label: string;
	className?: string;
}) {
	const report = useReportAction({ target, reference, ownerUsername });
	if (!report.available) return null;

	return (
		<>
			<DropdownMenu>
				<MoreButton label={label} className={className} />
				<DropdownMenuContent align="end" className="min-w-44">
					<ReportMenuItem onSelect={report.request} />
				</DropdownMenuContent>
			</DropdownMenu>
			{report.dialog}
		</>
	);
}
