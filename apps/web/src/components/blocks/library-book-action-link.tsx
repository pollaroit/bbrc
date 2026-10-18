"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookPlus, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AdminBookRequestsSheet } from "@/components/blocks/admin-book-requests-sheet";
import { AdminDocumentRequestsSheet } from "@/components/blocks/admin-document-requests-sheet";
import { UserBookRequestsSheet } from "@/components/blocks/user-book-requests-sheet";
import { UserDocumentsSheet } from "@/components/blocks/user-documents-sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LibraryBookActionLinkProps = {
	appearance?: "default" | "library";
};

export function LibraryBookActionLink({
	appearance = "default",
}: LibraryBookActionLinkProps) {
	const { data: session, isPending } = authClient.useSession();
	const isLibrary = appearance === "library";
	const secondaryTrigger = isLibrary ? "ghost" : "outline";

	if (isPending || !session?.user) {
		return null;
	}

	if (session.user.isAdmin) {
		return (
			<div
				className={cn(
					"flex flex-wrap items-center gap-2",
					isLibrary && "flex-col sm:items-end sm:gap-3",
				)}
			>
				<div className="flex flex-wrap items-center gap-2">
					<AdminBookRequestsSheet triggerVariant={secondaryTrigger} />
					<AdminDocumentRequestsSheet triggerVariant={secondaryTrigger} />
				</div>
				<Button
					render={<Link href={"/books/new" as Route} />}
					nativeButton={false}
					size="sm"
					className={cn(isLibrary && "w-full sm:w-auto")}
				>
					<Plus data-icon="inline-start" />
					Add book
				</Button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2",
				isLibrary && "flex-col sm:items-end sm:gap-3",
			)}
		>
			<div className="flex flex-wrap items-center gap-2">
				<UserBookRequestsSheet triggerVariant={secondaryTrigger} />
				<UserDocumentsSheet triggerVariant={secondaryTrigger} />
			</div>
			<Button
				render={<Link href={"/books/request" as Route} />}
				nativeButton={false}
				size="sm"
				className={cn(isLibrary && "w-full sm:w-auto")}
			>
				<BookPlus data-icon="inline-start" />
				Request book
			</Button>
		</div>
	);
}
