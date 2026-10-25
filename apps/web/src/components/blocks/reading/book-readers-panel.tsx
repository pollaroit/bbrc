"use client";

import type { ListBookReadersOutputSchema } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Progress } from "@bbrc/ui/components/progress";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { z } from "zod";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { authClient } from "@/lib/auth-client";
import { useReadingState } from "@/lib/reading/use-reading";
import { orpc } from "@/utils/orpc";

const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

type Reader = z.infer<typeof ListBookReadersOutputSchema>["items"][number];

/*
 * Who is reading this book right now: a panel per member with their progress
 * and edition. A member who keeps their progress private shows only as
 * "Reading"; one who hides what they read is left out (and counted in a note).
 *
 * <BookReadersPanel bookSlug bookTitle bookPages />
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
};

export function BookReadersPanel({ bookSlug, bookTitle, bookPages }: Props) {
	const { data: session } = authClient.useSession();
	const readers = useQuery(
		orpc.reading.readers.queryOptions({ input: { bookSlug } }),
	);
	const state = useReadingState(bookSlug, Boolean(session?.user));
	const [startOpen, setStartOpen] = useState(false);

	if (readers.isPending) {
		return (
			<div className="flex flex-col gap-3" aria-hidden>
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}

	if (readers.isError) {
		return (
			<p className="text-destructive text-sm">
				Could not load who is reading this. Try again in a moment.
			</p>
		);
	}

	const { items, total } = readers.data;
	const hidden = Math.max(0, total - items.length);
	const canStart =
		Boolean(session?.user) &&
		state.data != null &&
		!state.data.hasRead &&
		state.data.reading == null;

	return (
		<div className="flex flex-col gap-4">
			{items.length === 0 ? (
				<div className="flex flex-col items-start gap-3 border border-border border-dashed p-6">
					<BookOpen className="size-5 text-muted-foreground" aria-hidden />
					<div className="flex flex-col gap-1">
						<p className="font-medium text-sm">
							{hidden > 0
								? "Members are reading this, but keep it private"
								: "Nobody is reading this right now"}
						</p>
						<p className="max-w-prose text-muted-foreground text-sm">
							{hidden > 0
								? `${hidden} ${hidden === 1 ? "member is" : "members are"} reading it and chose not to be listed.`
								: "Start reading it and you will show up here with your progress."}
						</p>
					</div>
				</div>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2">
					{items.map((reader) => (
						<ReaderCard key={reader.username} reader={reader} />
					))}
				</ul>
			)}

			{items.length > 0 && hidden > 0 ? (
				<p className="text-muted-foreground text-xs">
					{hidden} more {hidden === 1 ? "member keeps" : "members keep"} what
					they read private.
				</p>
			) : null}

			{canStart ? (
				<div>
					<Button type="button" onClick={() => setStartOpen(true)}>
						<BookOpen data-icon="inline-start" aria-hidden />
						I'm reading this too
					</Button>
					<StartReadingDialog
						bookSlug={bookSlug}
						bookTitle={bookTitle}
						bookPages={bookPages}
						open={startOpen}
						onOpenChange={setStartOpen}
					/>
				</div>
			) : null}
		</div>
	);
}

function ReaderCard({ reader }: { reader: Reader }) {
	const showProgress = reader.percent != null;
	return (
		<li className="flex flex-col gap-3 border border-border p-4">
			<div className="flex items-center gap-3">
				<UserAvatar user={reader} className="size-10" />
				<div className="flex min-w-0 flex-col">
					<Link
						href={`/users/${reader.username}` as Route}
						className="truncate font-medium text-sm underline-offset-4 hover:underline"
					>
						{reader.name}
						{reader.isViewer ? (
							<span className="ms-1.5 border border-border px-1 font-normal text-2xs text-muted-foreground">
								You
							</span>
						) : null}
					</Link>
					<p className="text-muted-foreground text-xs">
						@{reader.username} · started{" "}
						<RelativeTime date={reader.startedAt} />
					</p>
				</div>
			</div>

			{showProgress ? (
				<div className="flex flex-col gap-1.5">
					<Progress
						value={reader.percent ?? 0}
						aria-label={`${reader.name}'s progress`}
						className="gap-0"
					/>
					<p className="flex justify-between text-muted-foreground text-xs tabular-nums">
						<span>{reader.percent}%</span>
						{reader.currentPage != null && reader.totalPages != null ? (
							<span>
								page {reader.currentPage} of {reader.totalPages}
							</span>
						) : null}
					</p>
				</div>
			) : (
				<p className="text-muted-foreground text-xs">Reading</p>
			)}

			{reader.edition?.label ? (
				<p className="truncate text-muted-foreground text-xs">
					Edition: {reader.edition.label}
				</p>
			) : null}
		</li>
	);
}
