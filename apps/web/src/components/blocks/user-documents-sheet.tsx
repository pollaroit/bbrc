"use client";

import { documentLanguageLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Sheet, SheetContent } from "@bbrc/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { RelativeTime } from "@/components/blocks/relative-time";
import {
	ListingSideSheetBody,
	ListingSideSheetHeader,
	listingSideSheetContentClassName,
} from "@/components/listing/listing-side-sheet";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type UserDocumentsSheetProps = {
	triggerVariant?: "outline" | "ghost";
};

export function UserDocumentsSheet({
	triggerVariant = "outline",
}: UserDocumentsSheetProps) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [open, setOpen] = useState(false);

	const { data, isPending: isListPending } = useQuery({
		...orpc.document.listMine.queryOptions(),
		enabled: Boolean(session?.user),
		staleTime: 30_000,
	});

	if (isSessionPending || !session?.user || session.user.isAdmin) {
		return null;
	}

	const pendingCount =
		data?.items.filter((item) => item.status === "pending").length ?? 0;
	const label =
		pendingCount > 0 ? `My documents (${pendingCount})` : "My documents";

	return (
		<>
			<Button
				type="button"
				variant={triggerVariant}
				size="sm"
				onClick={() => setOpen(true)}
				disabled={isListPending && !data}
			>
				<FileText data-icon="inline-start" />
				{label}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className={listingSideSheetContentClassName}>
					<ListingSideSheetHeader
						title="Your documents"
						description="Documents you submitted for club books and their review status."
					/>
					<ListingSideSheetBody>
						{!data?.count ? (
							<p className="text-muted-foreground text-sm">
								You have not submitted any documents yet.
							</p>
						) : (
							<ul className="flex flex-col gap-3">
								{data.items.map((item) => (
									<li
										key={item.id}
										className="border border-border bg-muted/10 p-4"
									>
										<p className="font-medium text-sm">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											<Link
												href={`/books/${item.bookSlug}` as Route}
												className="text-foreground underline-offset-2 hover:underline"
											>
												{item.bookTitle}
											</Link>{" "}
											· {documentLanguageLabel(item.language)} ·{" "}
											<span className="capitalize">{item.status}</span> ·{" "}
											<RelativeTime date={item.createdAt} />
										</p>
										{item.status === "rejected" && item.rejectionReason ? (
											<p className="mt-2 text-destructive text-xs">
												{item.rejectionReason}
											</p>
										) : null}
										{item.status === "approved" && item.acceptanceNotes ? (
											<p className="mt-2 text-muted-foreground text-xs">
												{item.acceptanceNotes}
											</p>
										) : null}
										<div className="mt-2">
											<Link
												href={
													`/books/${item.bookSlug}/edit/docs/${item.slug}/edit` as Route
												}
												className="text-foreground text-xs underline-offset-2 hover:underline"
											>
												Edit
											</Link>
										</div>
									</li>
								))}
							</ul>
						)}
					</ListingSideSheetBody>
				</SheetContent>
			</Sheet>
		</>
	);
}
