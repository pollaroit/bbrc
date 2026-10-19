"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function ChipPlaceholder() {
	return (
		<div
			className="h-8 min-w-0 flex-1 animate-pulse border border-border bg-muted/30"
			aria-hidden="true"
		/>
	);
}

export function ActiveSittingTopChip({ className }: { className?: string }) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session != null,
	});

	if (isSessionPending || (session && isOngoingPending)) {
		return <ChipPlaceholder />;
	}

	if (!session || !ongoing?.viewerIsParticipant) {
		return null;
	}

	const href =
		ongoing.status === "voting"
			? (`/sittings/${ongoing.slug}/vote` as Route)
			: (`/sittings/${ongoing.slug}` as Route);

	const phaseDeadline =
		ongoing.status === "voting" && ongoing.pollDeadline
			? ongoing.pollDeadline
			: ongoing.status !== "voting"
				? ongoing.deadline
				: null;

	const titleLine =
		ongoing.selectedBookTitle?.trim() ||
		ongoing.displayName ||
		"Sitting in progress";

	const authorsLine =
		ongoing.selectedBookAuthors.length > 0
			? formatBookAuthors(ongoing.selectedBookAuthors)
			: null;

	return (
		<Link
			href={href}
			className={cn(
				"flex h-8 min-w-0 flex-1 items-center gap-2 border border-primary/40 bg-primary/10 px-2.5 text-left text-xs transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			aria-label={`Open sitting: ${titleLine}`}
		>
			<div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
				<span className="truncate font-medium">{titleLine}</span>
				<span className="truncate text-[0.65rem] text-muted-foreground">
					{authorsLine ? `${authorsLine} · ` : null}
					{phaseDeadline ? formatDateTime(phaseDeadline) : "Open sitting"}
				</span>
			</div>
			<span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground tabular-nums">
				<Users className="size-3.5" aria-hidden />
				{ongoing.participantCount}
			</span>
		</Link>
	);
}
