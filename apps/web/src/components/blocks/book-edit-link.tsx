"use client";

import { Button } from "@bbrc/ui/components/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { editBookPageHref } from "@/lib/edit-book-search-params";
import { cn } from "@/lib/utils";

type BookEditLinkProps = {
	slug: string;
	className?: string;
	/** After save, return here instead of the book detail page (e.g. `books`). */
	redirect?: string;
};

export function BookEditLink({ slug, className, redirect }: BookEditLinkProps) {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user.isAdmin) {
		return null;
	}

	return (
		<Button
			render={<Link href={editBookPageHref(slug, redirect)} />}
			nativeButton={false}
			variant="ghost"
			size="icon-sm"
			className={cn(
				"shrink-0 text-muted-foreground hover:text-foreground",
				className,
			)}
			aria-label="Edit book"
		>
			<Pencil className="size-4" />
		</Button>
	);
}
