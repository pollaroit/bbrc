"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { AtSign, MoreHorizontal } from "lucide-react";
import { type ReactNode, useState } from "react";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { useRemoveMyMention } from "@/lib/mention/use-remove-my-mention";
import {
	type MentionContentKind,
	useViewerMention,
} from "@/lib/mention/use-viewer-mention";

const WHAT: Record<MentionContentKind, string> = {
	post: "post",
	comment: "comment",
	review: "review",
};

/**
 * For the member who was mentioned in a post, comment or review: the item for a
 * menu, and its confirm dialog. `available` is false until we know there is a
 * mention, so menus stay hidden for everyone else.
 */
export function useRemoveMyMentionAction(
	kind: MentionContentKind,
	slug: string,
) {
	const { data: session } = authClient.useSession();
	const mentionId = useViewerMention(kind, slug, Boolean(session?.user));
	const [open, setOpen] = useState(false);
	const remove = useRemoveMyMention(kind, slug);

	const dialog: ReactNode = mentionId ? (
		<DestructiveConfirmDialog
			open={open}
			onOpenChange={setOpen}
			title="Remove your mention?"
			description={`Your name stays in the ${WHAT[kind]} as plain text. The author is not notified.`}
			confirmLabel="Remove my mention"
			onConfirm={() => {
				setOpen(false);
				remove.mutate({ id: mentionId });
			}}
		/>
	) : null;

	return {
		available: Boolean(mentionId),
		request: () => setOpen(true),
		dialog,
	};
}

/** The menu item itself, for menus that already exist (post options). */
export function RemoveMyMentionMenuItem({
	onSelect,
}: {
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onClick={onSelect}>
			<AtSign aria-hidden />
			Remove my mention
		</DropdownMenuItem>
	);
}

/** A small "…" menu with just this action; renders nothing unless the viewer is mentioned. */
export function RemoveMyMentionMenu({
	kind,
	slug,
	className,
}: {
	kind: MentionContentKind;
	slug: string;
	className?: string;
}) {
	const action = useRemoveMyMentionAction(kind, slug);
	if (!action.available) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className={className ?? "text-muted-foreground"}
							aria-label={`Options for this ${WHAT[kind]}`}
						/>
					}
				>
					<MoreHorizontal className="size-4" aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					<RemoveMyMentionMenuItem onSelect={action.request} />
				</DropdownMenuContent>
			</DropdownMenu>
			{action.dialog}
		</>
	);
}
