"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { BookCheck } from "lucide-react";
import { useState } from "react";
import { BookMarkReadDialog } from "@/components/blocks/book-mark-read-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookMarkReadButtonProps = {
	bookSlug: string;
	bookTitle: string;
	className?: string;
};

export function BookMarkReadButton({
	bookSlug,
	bookTitle,
	className,
}: BookMarkReadButtonProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [open, setOpen] = useState(false);

	const stateQuery = useQuery({
		...orpc.read.getBookReadState.queryOptions({
			input: { bookSlug },
		}),
		enabled: Boolean(session?.user),
	});

	if (sessionPending || !session?.user) {
		return null;
	}

	const hasRead = stateQuery.data?.hasRead ?? false;

	return (
		<>
			<Button
				type="button"
				variant={hasRead ? "secondary" : "default"}
				className={cn("w-full", className)}
				onClick={() => setOpen(true)}
			>
				<BookCheck data-icon="inline-start" />
				{hasRead ? "Edit read" : "Mark read"}
			</Button>
			<BookMarkReadDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
