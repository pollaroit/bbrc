"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookPlus, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AdminBookRequestsSheet } from "@/components/blocks/admin-book-requests-sheet";
import { UserBookRequestsSheet } from "@/components/blocks/user-book-requests-sheet";
import { authClient } from "@/lib/auth-client";

export function LibraryBookActionLink() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user) {
		return null;
	}

	if (session.user.isAdmin) {
		return (
			<div className="flex flex-wrap items-center gap-2">
				<AdminBookRequestsSheet />
				<Button
					render={<Link href={"/books/new" as Route} />}
					nativeButton={false}
					size="sm"
				>
					<Plus />
					Add book
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<UserBookRequestsSheet />
			<Button
				render={<Link href={"/books/request" as Route} />}
				nativeButton={false}
				size="sm"
			>
				<BookPlus />
				Request book
			</Button>
		</div>
	);
}
