"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { BookPlus, LayoutList, PenLine, Plus, Sofa } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export function AdminCreateMenu() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session?.user.isAdmin === true,
	});
	const { openCompose } = useComposePost();

	if (isSessionPending || !session?.user) {
		return null;
	}

	const isAdmin = session.user.isAdmin;
	const showStartSitting = isAdmin && !isOngoingPending && !ongoing;
	const newShelfHref = `/users/${session.user.username}/shelves/new` as Route;

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
						render={<Link href={newShelfHref} />}
						nativeButton={false}
					>
						<LayoutList className="size-4" aria-hidden="true" />
						Create shelf
					</DropdownMenuItem>
					{isAdmin ? (
						<DropdownMenuItem
							render={<Link href={"/books/new" as Route} />}
							nativeButton={false}
						>
							<BookPlus className="size-4" aria-hidden="true" />
							Add book
						</DropdownMenuItem>
					) : null}
					{showStartSitting ? (
						<DropdownMenuItem
							render={<Link href={"/sittings/new" as Route} />}
							nativeButton={false}
						>
							<Sofa className="size-4" aria-hidden="true" />
							Start sitting
						</DropdownMenuItem>
					) : null}
					{isAdmin ? (
						<DropdownMenuItem onClick={() => openCompose()}>
							<PenLine className="size-4" aria-hidden="true" />
							Create post
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
