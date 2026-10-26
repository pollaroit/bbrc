"use client";

import type { AdminAuthorListOutput } from "@bbrc/api/modules/author-admin/author-dashboard.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { toast } from "sonner";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import { client } from "@/utils/orpc";

type AuthorRow = AdminAuthorListOutput["items"][number];

export function AdminAuthorRowActions({ author }: { author: AuthorRow }) {
	const confirm = useMutation({
		mutationFn: () => client.authorAdmin.confirm({ id: author.id }),
		onSuccess: () => {
			toast.success(`${author.name} confirmed.`);
			invalidateAuthorQueries();
		},
		onError: (error) => toast.error(error.message || "Could not confirm."),
	});
	const refresh = useMutation({
		mutationFn: () => client.authorAdmin.refresh({ id: author.id }),
		onSuccess: () => {
			toast.success("Looked up again.");
			invalidateAuthorQueries();
		},
		onError: (error) => toast.error(error.message || "The lookup failed."),
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-sm" aria-label="Author actions" />
				}
			>
				<MoreHorizontal />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={<Link href={`/authors/${author.slug}` as Route} />}
				>
					View
				</DropdownMenuItem>
				<DropdownMenuItem
					render={<Link href={`/authors/${author.slug}/edit` as Route} />}
				>
					Edit
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					disabled={author.status === "verified" || confirm.isPending}
					onClick={() => confirm.mutate()}
				>
					Confirm
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={refresh.isPending}
					onClick={() => refresh.mutate()}
				>
					Look up again
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
