"use client";

import type { EditionReaders as EditionReadersData } from "@bbrc/api/modules/edition/edition.schema";
import { Progress } from "@bbrc/ui/components/progress";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { readMonthLabel } from "@/lib/edition/format";
import { orpc } from "@/utils/orpc";

/**
 * Who is reading this edition and who has read it. The counts are public; the
 * names are for signed-in members, and "reading now" follows each member's
 * privacy settings (the API already leaves out what they keep private).
 */
export function EditionReaders({
	bookSlug,
	editionKey,
}: {
	bookSlug: string;
	editionKey: string;
}) {
	const query = useQuery({
		...orpc.edition.readers.queryOptions({
			input: { bookSlug, key: editionKey },
		}),
		staleTime: 30_000,
	});

	return (
		<EditionSection
			id="edition-readers"
			title="Readers"
			description="Members who are reading this edition or have read it."
		>
			{query.isPending ? (
				<div className="grid gap-4 md:grid-cols-2" aria-hidden>
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			) : query.isError ? (
				<p className="text-muted-foreground text-sm">
					Could not load the readers just now. Refresh to try again.
				</p>
			) : (
				<ReadersBody data={query.data} />
			)}
		</EditionSection>
	);
}

function ReadersBody({ data }: { data: EditionReadersData }) {
	const { readingNow, finished, signedIn } = data;
	const hiddenReading = Math.max(0, readingNow.total - readingNow.items.length);

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<div className="flex flex-col gap-3">
				<h3 className="flex items-center gap-2 font-medium text-sm">
					<BookOpen className="size-4 text-muted-foreground" aria-hidden />
					Reading now
					<span className="font-normal text-muted-foreground tabular-nums">
						{readingNow.total}
					</span>
				</h3>
				{readingNow.items.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{readingNow.items.map((reader) => (
							<li
								key={reader.username}
								className="flex flex-col gap-2 border border-border p-3"
							>
								<div className="flex items-center gap-3">
									<UserAvatar user={reader} className="size-8" />
									<div className="flex min-w-0 flex-1 flex-col">
										<Link
											href={`/users/${reader.username}` as Route}
											className="truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{reader.isViewer ? "You" : reader.name}
										</Link>
										<span className="text-muted-foreground text-xs">
											Started <RelativeTime date={reader.startedAt} />
										</span>
									</div>
									{reader.percent != null ? (
										<span className="font-medium text-sm tabular-nums">
											{reader.percent}%
										</span>
									) : null}
								</div>
								{reader.percent != null ? (
									<>
										<Progress
											value={reader.percent}
											aria-label={`${reader.name} has read ${reader.percent}%`}
										/>
										{reader.currentPage != null && reader.totalPages != null ? (
											<p className="text-muted-foreground text-xs tabular-nums">
												Page {reader.currentPage} of {reader.totalPages}
											</p>
										) : null}
									</>
								) : null}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">
						{!signedIn && readingNow.total > 0
							? "Sign in to see who."
							: readingNow.total > 0
								? "Everyone reading it keeps that private."
								: "Nobody is reading this edition right now."}
					</p>
				)}
				{hiddenReading > 0 && readingNow.items.length > 0 ? (
					<p className="text-muted-foreground text-xs">
						{hiddenReading} more{" "}
						{hiddenReading === 1 ? "member keeps" : "members keep"} it private.
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-3">
				<h3 className="flex items-center gap-2 font-medium text-sm">
					<CheckCheck className="size-4 text-muted-foreground" aria-hidden />
					Read it
					<span className="font-normal text-muted-foreground tabular-nums">
						{finished.total}
					</span>
				</h3>
				{finished.items.length > 0 ? (
					<ul className="grid gap-2 sm:grid-cols-2">
						{finished.items.map((reader) => (
							<li
								key={reader.username}
								className="flex items-center gap-2 border border-border p-2"
							>
								<UserAvatar user={reader} className="size-8" />
								<div className="flex min-w-0 flex-col">
									<Link
										href={`/users/${reader.username}` as Route}
										className="truncate text-sm underline-offset-4 hover:underline"
									>
										{reader.isViewer ? "You" : reader.name}
									</Link>
									<span className="text-muted-foreground text-xs tabular-nums">
										{readMonthLabel(reader.readEndYear, reader.readEndMonth) ??
											"Date not set"}
									</span>
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">
						{!signedIn && finished.total > 0
							? "Sign in to see who."
							: "Nobody has marked this edition as read yet."}
					</p>
				)}
			</div>
			{!signedIn && (readingNow.total > 0 || finished.total > 0) ? (
				<p className="border border-border border-dashed p-3 text-muted-foreground text-sm md:col-span-2">
					<Link
						href={"/sign-in" as Route}
						className="text-foreground underline underline-offset-4"
					>
						Sign in
					</Link>{" "}
					to see which members they are.
				</p>
			) : null}
		</div>
	);
}
