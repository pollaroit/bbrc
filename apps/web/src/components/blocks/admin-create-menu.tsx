"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { BookPlus, PenLine, Plus, Sofa } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { ComposePostDialog } from "@/components/blocks/compose-post-form";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export function AdminCreateMenu() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session?.user.isAdmin === true,
	});
	const [composeOpen, setComposeOpen] = useState(false);

	if (isSessionPending || !session?.user.isAdmin) {
		return null;
	}

	const showStartSitting = !isOngoingPending && !ongoing;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={<Button type="button" size="sm" aria-label="Create" />}
				>
					<Plus data-icon="inline-start" aria-hidden="true" />
					Create
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					<DropdownMenuItem
						render={<Link href={"/books/new" as Route} />}
						nativeButton={false}
					>
						<BookPlus className="size-4" aria-hidden="true" />
						Add book
					</DropdownMenuItem>
					<DropdownMenuItem
						render={<Link href={"/books/blocked" as Route} />}
						nativeButton={false}
					>
						Blocked OL works
					</DropdownMenuItem>
					{showStartSitting ? (
						<DropdownMenuItem
							render={<Link href={"/sittings/new" as Route} />}
							nativeButton={false}
						>
							<Sofa className="size-4" aria-hidden="true" />
							Start sitting
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem onClick={() => setComposeOpen(true)}>
						<PenLine className="size-4" aria-hidden="true" />
						Create post
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<ComposePostDialog open={composeOpen} onOpenChange={setComposeOpen} />
		</>
	);
}
