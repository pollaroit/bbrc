import type { GetUserParticipationListOutput } from "@bbrc/api/modules/user/user.schema";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { progressLabels } from "@/components/blocks/sitting-participation-progress";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";

type UserReadingCardProps = {
	item: GetUserParticipationListOutput["items"][number];
};

export function UserReadingCard({ item }: UserReadingCardProps) {
	const { sitting } = item;
	const sittingHref = `/sittings/${sitting.slug}` as Route;
	const book = sitting.selectedBook;
	const bookHref = book ? (`/books/${book.slug}` as Route) : null;
	const coverSrc = book ? bookCoverUrl(book.coverId) : null;

	return (
		<Card size="sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
				<div className="min-w-0 space-y-1">
					<CardTitle className="text-base">
						<Link href={sittingHref} className="hover:underline">
							{sitting.displayName}
						</Link>
					</CardTitle>
					<p className="text-muted-foreground text-xs">
						Joined sitting · updated {formatDateTime(item.updatedAt)}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SittingStatusBadge status={sitting.status} />
					<Badge variant="outline">{progressLabels[item.progress]}</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
				{book && bookHref ? (
					<Link
						href={bookHref}
						className="flex min-w-0 flex-1 items-start gap-3 rounded-none border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
					>
						<div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes="56px"
								/>
							) : (
								<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
									No cover
								</div>
							)}
						</div>
						<div className="min-w-0">
							<p className="font-medium leading-snug">{book.title}</p>
							<p className="text-muted-foreground text-sm">
								{formatBookAuthors(book.authors)}
							</p>
						</div>
					</Link>
				) : (
					<p className="text-muted-foreground text-sm">
						{sitting.status === "voting"
							? "Book not chosen yet — poll in progress."
							: "No book selected for this sitting."}
					</p>
				)}
				<dl className="shrink-0 space-y-1 text-sm">
					<div>
						<dt className="text-muted-foreground text-xs">Started</dt>
						<dd>{formatDateTime(sitting.createdAt)}</dd>
					</div>
					{sitting.deadline ? (
						<div>
							<dt className="text-muted-foreground text-xs">Deadline</dt>
							<dd>{formatDateTime(sitting.deadline)}</dd>
						</div>
					) : null}
				</dl>
			</CardContent>
		</Card>
	);
}
