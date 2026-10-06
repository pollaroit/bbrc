"use client";

import { DropdownMenuItem } from "@bbrc/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, BookPlus, LayoutList, PenLine, Sofa } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type CreateMenuItemsProps = {
	onNavigate?: () => void;
};

export function CreateMenuItems({ onNavigate }: CreateMenuItemsProps) {
	const { data: session } = authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session?.user.isAdmin === true,
	});
	const { openCompose } = useComposePost();

	if (!session?.user) {
		return null;
	}

	const isAdmin = session.user.isAdmin === true;
	const showStartSitting = isAdmin && !isOngoingPending && !ongoing;
	const newShelfHref = `/users/${session.user.username}/shelves/new` as Route;

	return (
		<>
			<DropdownMenuItem
				onClick={() => {
					onNavigate?.();
					openCompose();
				}}
			>
				<PenLine className="size-4" aria-hidden="true" />
				Create post
			</DropdownMenuItem>
			<DropdownMenuItem
				render={<Link href={newShelfHref} onClick={onNavigate} />}
				nativeButton={false}
			>
				<LayoutList className="size-4" aria-hidden="true" />
				Create shelf
			</DropdownMenuItem>
			{isAdmin ? (
				<DropdownMenuItem
					render={<Link href={"/books/new" as Route} onClick={onNavigate} />}
					nativeButton={false}
				>
					<BookPlus className="size-4" aria-hidden="true" />
					Add book
				</DropdownMenuItem>
			) : (
				<DropdownMenuItem
					render={
						<Link href={"/books/request" as Route} onClick={onNavigate} />
					}
					nativeButton={false}
				>
					<BookMarked className="size-4" aria-hidden="true" />
					Request book
				</DropdownMenuItem>
			)}
			{showStartSitting ? (
				<DropdownMenuItem
					render={<Link href={"/sittings/new" as Route} onClick={onNavigate} />}
					nativeButton={false}
				>
					<Sofa className="size-4" aria-hidden="true" />
					Start sitting
				</DropdownMenuItem>
			) : null}
		</>
	);
}
