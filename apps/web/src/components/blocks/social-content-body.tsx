"use client";

import type { SpoilerContentKind } from "@bbrc/shared";
import { RichContentView } from "@/components/blocks/rich-content-view";
import { SpoilerContentGate } from "@/components/blocks/spoiler-content-gate";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type SocialContentBodyProps = {
	content: string;
	isSpoiler: boolean;
	kind: SpoilerContentKind;
	identifier: string;
	className?: string;
	interactiveLinks?: boolean;
	compact?: boolean;
};

export function SocialContentBody({
	content,
	isSpoiler,
	kind,
	identifier,
	className,
	interactiveLinks = false,
	compact = false,
}: SocialContentBodyProps) {
	const session = authClient.useSession();
	const username = session.data?.user.username ?? null;

	return (
		<SpoilerContentGate
			username={username}
			kind={kind}
			identifier={identifier}
			isSpoiler={isSpoiler}
		>
			<RichContentView
				content={content}
				interactiveLinks={interactiveLinks}
				compact={compact}
				className={className}
			/>
		</SpoilerContentGate>
	);
}
