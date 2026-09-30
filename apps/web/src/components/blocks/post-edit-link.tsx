"use client";

import { Button } from "@bbrc/ui/components/button";
import { Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type PostEditLinkProps = {
	slug: string;
	authorUsername: string;
	className?: string;
};

export function PostEditLink({
	slug,
	authorUsername,
	className,
}: PostEditLinkProps) {
	const { data: session, isPending } = authClient.useSession();

	if (
		isPending ||
		!session?.user.username ||
		session.user.username !== authorUsername
	) {
		return null;
	}

	return (
		<Button
			render={<Link href={`/posts/${slug}/edit` as Route} />}
			nativeButton={false}
			variant="ghost"
			size="icon-sm"
			className={cn(
				"shrink-0 text-muted-foreground hover:text-foreground",
				className,
			)}
			aria-label="Edit post"
		>
			<Pencil className="size-4" />
		</Button>
	);
}
