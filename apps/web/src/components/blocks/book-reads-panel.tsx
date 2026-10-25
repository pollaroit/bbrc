"use client";

import type { ListBookReadsOutput } from "@bbrc/api/modules/read/read.schema";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { EditionChip } from "@/components/blocks/edition-chip";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatReadFinishedMonthField } from "@/lib/format-read-date";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const readsGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

type BookReadsPanelProps = {
	bookSlug: string;
	initialData?: ListBookReadsOutput;
};

function BookReadsGrid({
	bookSlug,
	data,
}: {
	bookSlug: string;
	data: ListBookReadsOutput;
}) {
	if (data.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No reads yet</EmptyTitle>
					<EmptyDescription>
						When members mark this book as read, their dates show up here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className={readsGridClassName}>
			{data.items.map((item) => (
				<li
					key={item.user.username}
					className="flex h-full flex-col gap-3 border border-border p-4"
				>
					<UserPanel user={item.user} />
					<div className="flex min-w-0 flex-col items-start gap-1.5">
						<p className="text-muted-foreground text-sm">
							{formatReadFinishedMonthField(
								item.readEndYear,
								item.readEndMonth,
							)}
						</p>
						<EditionChip
							bookSlug={bookSlug}
							edition={item.edition}
							prefix="Read the"
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

export function BookReadsPanel({ bookSlug, initialData }: BookReadsPanelProps) {
	const readsQuery = useQuery({
		...orpc.read.listForBook.queryOptions({
			input: { bookSlug, limit: 100 },
		}),
		initialData,
		staleTime: 0,
	});

	if (readsQuery.isPending && !readsQuery.data) {
		return (
			<div className={cn(readsGridClassName)} aria-hidden>
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="h-36 w-full" />
				))}
			</div>
		);
	}

	if (readsQuery.isError) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load reads. Refresh the page to try again.
			</p>
		);
	}

	return <BookReadsGrid bookSlug={bookSlug} data={readsQuery.data} />;
}
