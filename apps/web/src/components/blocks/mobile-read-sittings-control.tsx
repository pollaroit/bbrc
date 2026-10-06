"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, List, Sofa } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const splitControlClass =
	"inline-flex shrink-0 border border-border bg-background";

export function MobileReadSittingsControl() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session != null,
	});

	if (isSessionPending || !session) {
		return null;
	}

	const showRead = !isOngoingPending && ongoing?.viewerIsParticipant === true;
	const ongoingHref = ongoing
		? (`/sittings/${ongoing.slug}` as Route)
		: undefined;

	return (
		<div
			className={cn(splitControlClass, showRead && "divide-x divide-border")}
		>
			{showRead && ongoingHref ? (
				<Button
					render={<Link href={ongoingHref} />}
					nativeButton={false}
					size="sm"
					className="h-8 max-w-[6rem] truncate border-0 px-3 shadow-none"
				>
					Read
				</Button>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							aria-label="Sittings menu"
							className={cn(
								"h-8 border-0 shadow-none",
								showRead ? "px-2" : "px-3",
							)}
						/>
					}
				>
					{showRead ? (
						<ChevronDown className="size-4" aria-hidden="true" />
					) : (
						<>
							<Sofa data-icon="inline-start" className="size-4" aria-hidden />
							Sittings
						</>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="min-w-44">
					<DropdownMenuItem
						render={<Link href={"/sittings" as Route} />}
						nativeButton={false}
					>
						<List className="size-4" aria-hidden="true" />
						All sittings
					</DropdownMenuItem>
					{showRead && ongoingHref ? (
						<DropdownMenuItem
							render={<Link href={ongoingHref} />}
							nativeButton={false}
						>
							<Sofa className="size-4" aria-hidden="true" />
							Current sitting
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
