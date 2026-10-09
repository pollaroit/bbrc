"use client";

import type { EditionDetailSummary } from "@bbrc/api/lib/open-library/work-editions";
import type { ListBookReadsOutput } from "@bbrc/api/modules/read/read.schema";
import { openLibraryEditionPageUrl } from "@bbrc/shared";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { UserPanel } from "@/components/blocks/user-panel";
import { bookCoverUrl } from "@/lib/book-cover";
import { formatReadPeriod } from "@/lib/format-read-date";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const readsGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

type BookReadsPanelProps = {
	bookSlug: string;
	initialData?: ListBookReadsOutput;
	editionById: Map<string, EditionDetailSummary>;
};

function BookReadsGrid({
	data,
	editionById,
}: {
	data: ListBookReadsOutput;
	editionById: Map<string, EditionDetailSummary>;
}) {
	if (data.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No reads yet</EmptyTitle>
					<EmptyDescription>
						When members mark this book as read, their copies and dates show up
						here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className={readsGridClassName}>
			{data.items.map((item) => {
				const edition = item.editionId
					? editionById.get(item.editionId)
					: undefined;
				const coverSrc = bookCoverUrl(edition?.coverId, "S");
				const olUrl = item.editionId
					? openLibraryEditionPageUrl(item.editionId)
					: null;

				return (
					<li
						key={item.user.username}
						className="flex h-full flex-col gap-3 border border-border p-4"
					>
						<UserPanel user={item.user} />
						<p className="text-muted-foreground text-sm">
							{formatReadPeriod(item.readStart, item.readEnd)}
						</p>

						{edition || item.editionId ? (
							<div className="mt-auto flex items-start gap-3 border border-border bg-muted/20 p-3">
								<div className="relative size-14 shrink-0 overflow-hidden bg-muted">
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes="56px"
										/>
									) : null}
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-medium text-sm leading-snug">
										{edition?.title ?? item.editionId}
									</p>
									<p className="text-muted-foreground text-xs">
										{[
											edition?.publishDate,
											edition?.pages ? `${edition.pages} pp.` : null,
										]
											.filter(Boolean)
											.join(" · ")}
									</p>
									{olUrl ? (
										<a
											href={olUrl}
											target="_blank"
											rel="noreferrer"
											className="mt-1 inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
										>
											Open Library
											<ExternalLink className="size-3" />
										</a>
									) : null}
								</div>
							</div>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

export function BookReadsPanel({
	bookSlug,
	initialData,
	editionById,
}: BookReadsPanelProps) {
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

	return <BookReadsGrid data={readsQuery.data} editionById={editionById} />;
}
