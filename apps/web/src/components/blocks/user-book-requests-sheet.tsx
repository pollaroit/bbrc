"use client";

import { Button } from "@bbrc/ui/components/button";
import { Sheet, SheetContent } from "@bbrc/ui/components/sheet";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@bbrc/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { BookMarked } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OpenLibraryWorkTitleLink } from "@/components/blocks/open-library-work-title-link";
import { RelativeTime } from "@/components/blocks/relative-time";
import {
	ListingSideSheetBody,
	ListingSideSheetHeader,
	listingSideSheetContentClassName,
} from "@/components/listing/listing-side-sheet";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type RequestTab = "pending" | "accepted" | "rejected";

type MyBookRequestItem = {
	id: string;
	olid: string;
	title: string;
	status: RequestTab;
	createdAt: Date;
	acceptanceNotes: string | null;
	rejectionReason: string | null;
	bookSlug: string | null;
};

function RequestListItem({
	item,
	tab,
}: {
	item: MyBookRequestItem;
	tab: RequestTab;
}) {
	const statusDescription =
		tab === "accepted"
			? item.acceptanceNotes?.trim()
			: tab === "rejected"
				? item.rejectionReason?.trim()
				: null;

	return (
		<li className="flex flex-col gap-3 border border-border bg-muted/10 p-4">
			<div className="space-y-1">
				<OpenLibraryWorkTitleLink olid={item.olid} title={item.title} />
				<p className="text-muted-foreground text-xs">
					Requested <RelativeTime date={item.createdAt} />
				</p>
				{statusDescription ? (
					<p className="text-muted-foreground text-sm leading-relaxed">
						{statusDescription}
					</p>
				) : tab === "accepted" || tab === "rejected" ? (
					<p className="text-muted-foreground text-sm italic">
						No note from admins.
					</p>
				) : (
					<p className="text-muted-foreground text-sm">
						Waiting for an admin to review this request.
					</p>
				)}
			</div>
			{tab === "accepted" && item.bookSlug ? (
				<Button
					render={<Link href={`/books/${item.bookSlug}` as Route} />}
					nativeButton={false}
					size="sm"
					variant="outline"
					className="w-fit"
				>
					View in library
				</Button>
			) : null}
		</li>
	);
}

function RequestTabPanel({
	items,
	tab,
	emptyMessage,
}: {
	items: MyBookRequestItem[];
	tab: RequestTab;
	emptyMessage: string;
}) {
	if (items.length === 0) {
		return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
	}

	return (
		<ul className="flex flex-col gap-3">
			{items.map((item) => (
				<RequestListItem key={item.id} item={item} tab={tab} />
			))}
		</ul>
	);
}

type UserBookRequestsSheetProps = {
	triggerVariant?: "outline" | "ghost";
};

export function UserBookRequestsSheet({
	triggerVariant = "outline",
}: UserBookRequestsSheetProps) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [open, setOpen] = useState(false);

	const isMember =
		session != null &&
		!session.user.isAdmin &&
		session.user.status !== "banned";

	const { data, isPending: isListPending } = useQuery({
		...orpc.bookRequest.listMine.queryOptions(),
		enabled: isMember,
		staleTime: 30_000,
	});

	const grouped = useMemo(() => {
		const pending: MyBookRequestItem[] = [];
		const accepted: MyBookRequestItem[] = [];
		const rejected: MyBookRequestItem[] = [];

		for (const item of data?.items ?? []) {
			if (item.status === "pending") {
				pending.push(item);
			} else if (item.status === "accepted") {
				accepted.push(item);
			} else if (item.status === "rejected") {
				rejected.push(item);
			}
		}

		return { pending, accepted, rejected };
	}, [data?.items]);

	if (isSessionPending || !isMember) {
		return null;
	}

	const totalCount = data?.count ?? 0;
	const pendingCount = grouped.pending.length;
	const label = pendingCount > 0 ? `Requested (${pendingCount})` : "Requested";
	const isLoading = isListPending && data == null;

	return (
		<>
			<Button
				type="button"
				variant={triggerVariant}
				size="sm"
				disabled={isLoading || totalCount === 0}
				onClick={() => setOpen(true)}
			>
				<BookMarked data-icon="inline-start" />
				{label}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className={listingSideSheetContentClassName}>
					<ListingSideSheetHeader
						title="Your book requests"
						description="Titles you asked to add to the club library and their status."
					/>
					<ListingSideSheetBody className="overflow-hidden">
						{totalCount === 0 ? (
							<p className="text-muted-foreground text-sm">
								You have not requested any books yet.
							</p>
						) : (
							<Tabs
								defaultValue="pending"
								className="flex min-h-0 flex-1 flex-col gap-4"
							>
								<TabsList
									variant="line"
									className="h-auto w-full shrink-0 justify-start gap-0"
								>
									<TabsTrigger value="pending" className="flex-1">
										Pending ({grouped.pending.length})
									</TabsTrigger>
									<TabsTrigger value="accepted" className="flex-1">
										Accepted ({grouped.accepted.length})
									</TabsTrigger>
									<TabsTrigger value="rejected" className="flex-1">
										Rejected ({grouped.rejected.length})
									</TabsTrigger>
								</TabsList>
								<div className="min-h-0 flex-1 overflow-y-auto">
									<TabsContent value="pending" className="mt-0">
										<RequestTabPanel
											items={grouped.pending}
											tab="pending"
											emptyMessage="No pending requests."
										/>
									</TabsContent>
									<TabsContent value="accepted" className="mt-0">
										<RequestTabPanel
											items={grouped.accepted}
											tab="accepted"
											emptyMessage="No accepted requests yet."
										/>
									</TabsContent>
									<TabsContent value="rejected" className="mt-0">
										<RequestTabPanel
											items={grouped.rejected}
											tab="rejected"
											emptyMessage="No rejected requests."
										/>
									</TabsContent>
								</div>
							</Tabs>
						)}
					</ListingSideSheetBody>
				</SheetContent>
			</Sheet>
		</>
	);
}
