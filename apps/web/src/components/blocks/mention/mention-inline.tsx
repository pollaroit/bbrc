"use client";

import type { MentionNode } from "@bbrc/shared";
import { mentionLabel } from "@bbrc/shared";
import { RichInlineLink } from "@/components/blocks/rich-inline-link";
import { useMentionProfile } from "@/lib/mention/use-mention-profiles";

/**
 * A mention in rendered text: the member's current name as a highlighted link
 * to their profile. Someone who no longer exists reads as plain "@Saved Name".
 * Older mentions (username only) show the saved name and link by username.
 */
export function MentionInline({
	node,
	className,
}: {
	node: MentionNode;
	className?: string;
}) {
	const state = useMentionProfile(node.userId);
	const saved = mentionLabel(node);

	if (state.status === "missing") {
		return <span>@{saved}</span>;
	}

	const profile = state.status === "ok" ? state.profile : null;
	return (
		<RichInlineLink
			href={`/users/${profile?.username ?? node.username}`}
			tone="member"
			className={className}
		>
			@{profile?.name ?? saved}
		</RichInlineLink>
	);
}
