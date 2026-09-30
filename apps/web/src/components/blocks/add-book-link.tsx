"use client";

import { Button } from "@bbrc/ui/components/button";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function AddBookLink() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user.isAdmin) {
		return null;
	}

	return (
		<Button
			render={<Link href={"/books/new" as Route} />}
			nativeButton={false}
			size="sm"
		>
			<Plus />
			Add book
		</Button>
	);
}
