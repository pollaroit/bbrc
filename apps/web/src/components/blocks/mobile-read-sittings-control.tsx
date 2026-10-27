"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const sittingsHref = "/sittings" as Route;

/** Shared height + border for top-bar sitting controls (matches bar rhythm). */
const controlFrameClass =
	"inline-flex h-8 shrink-0 items-stretch border border-border bg-background";

function SittingsIndexButton({
	className,
	showLabel = false,
}: {
	className?: string;
	showLabel?: boolean;
}) {
	return (
		<Button
			render={<Link href={sittingsHref} />}
			nativeButton={false}
			variant="ghost"
			size={showLabel ? "sm" : "icon-sm"}
			className={cn(
				"h-8 shadow-none",
				showLabel ? "px-2.5" : "size-8 border-0",
				className,
			)}
			aria-label={showLabel ? undefined : "Sittings"}
		>
			<BookOpen
				className="size-4 shrink-0"
				data-icon={showLabel ? "inline-start" : undefined}
				aria-hidden="true"
			/>
			{showLabel ? "Sittings" : null}
		</Button>
	);
}

function ReadSittingButton({ href }: { href: Route }) {
	return (
		<Button
			render={<Link href={href} />}
			nativeButton={false}
			size="sm"
			className="h-8 border-0 px-3 shadow-none"
		>
			Read
		</Button>
	);
}

function ControlPlaceholder() {
	return (
		<div
			className="h-8 w-20 animate-pulse border border-border bg-muted/30"
			aria-hidden="true"
		/>
	);
}

export function MobileReadSittingsControl() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session != null,
	});

	if (isSessionPending) {
		return <ControlPlaceholder />;
	}

	if (!session) {
		return (
			<div className={controlFrameClass}>
				<SittingsIndexButton showLabel className="hover:bg-muted/80" />
			</div>
		);
	}

	if (isOngoingPending) {
		return (
			<div className={controlFrameClass}>
				<SittingsIndexButton />
			</div>
		);
	}

	const showRead = ongoing?.viewerIsParticipant === true;
	const ongoingHref = ongoing
		? (`/sittings/${ongoing.slug}` as Route)
		: undefined;

	if (showRead && ongoingHref) {
		return (
			<div className={cn(controlFrameClass, "divide-x divide-border")}>
				<SittingsIndexButton className="hover:bg-muted/80" />
				<ReadSittingButton href={ongoingHref} />
			</div>
		);
	}

	return (
		<div className={controlFrameClass}>
			<SittingsIndexButton className="hover:bg-muted/80" />
		</div>
	);
}
