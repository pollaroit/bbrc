"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookCheck } from "lucide-react";
import Link from "next/link";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { useSignInHref } from "@/components/blocks/sign-in-link";
import { authClient } from "@/lib/auth-client";

/**
 * The one filled button of the book page: mark it read (or edit the read).
 * It sits under the cover on wide screens and above the numbers on phones.
 * Signed out, it asks to sign in.
 */
export function BookPrimaryAction({
	slug,
	title,
	pages,
}: {
	slug: string;
	title: string;
	pages: number;
}) {
	const { data: session, isPending } = authClient.useSession();
	const signInHref = useSignInHref();

	return (
		<div className="flex min-h-9 w-full">
			{session?.user ? (
				<BookMarkReadButton
					bookSlug={slug}
					bookTitle={title}
					bookPages={pages}
					size="hero"
				/>
			) : isPending ? null : (
				<Button
					nativeButton={false}
					render={<Link href={signInHref} />}
					className="h-9 w-full gap-2 px-4 font-semibold"
				>
					<BookCheck aria-hidden />
					Sign in to track it
				</Button>
			)}
		</div>
	);
}
