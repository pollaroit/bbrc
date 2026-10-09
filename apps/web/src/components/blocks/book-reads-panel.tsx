import type { EditionDetailSummary } from "@bbrc/api/lib/open-library/work-editions";
import type { ListBookReadsOutput } from "@bbrc/api/modules/read/read.schema";
import { openLibraryEditionPageUrl } from "@bbrc/shared";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { UserPanel } from "@/components/blocks/user-panel";
import { bookCoverUrl } from "@/lib/book-cover";
import { formatReadPeriod } from "@/lib/format-read-date";

type BookReadsPanelProps = {
	data: ListBookReadsOutput;
	editionById: Map<string, EditionDetailSummary>;
};

export function BookReadsPanel({ data, editionById }: BookReadsPanelProps) {
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
		<ul className="flex flex-col divide-y divide-border border border-border">
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
						key={`${item.user.username}-${item.recordedAt.toISOString()}`}
						className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start"
					>
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<UserPanel user={item.user} />
							<p className="text-muted-foreground text-sm">
								{formatReadPeriod(item.readStart, item.readEnd)}
							</p>
						</div>

						{edition || item.editionId ? (
							<div className="flex w-full max-w-sm items-start gap-3 border border-border bg-muted/20 p-3 sm:w-auto">
								<div className="relative size-16 shrink-0 bg-muted">
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes="64px"
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
