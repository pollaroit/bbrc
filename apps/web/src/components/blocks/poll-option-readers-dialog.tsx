"use client";

import type { GetPollOptionReadersOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

type PollOptionReadersDialogPollProps = {
	source: "poll";
	pollOptionId: string | null;
	readCount: number;
	onDismiss: () => void;
};

type PollOptionReadersDialogPreviewProps = {
	source: "preview";
	bookId: string | null;
	participantUserIds: string[];
	readCount: number;
	onDismiss: () => void;
};

export type PollOptionReadersDialogProps =
	| PollOptionReadersDialogPollProps
	| PollOptionReadersDialogPreviewProps;

const PLACEHOLDER_UUID = "00000000-0000-4000-8000-000000000001";

function ReadersDialogBody({
	readCount,
	query,
}: {
	readCount: number;
	query: {
		isPending: boolean;
		isError: boolean;
		error: Error | null;
		data: GetPollOptionReadersOutput | undefined;
	};
}) {
	const readers = query.data?.readers ?? [];
	const bookTitle = query.data?.bookTitle;
	const participantCount = query.data?.participantCount ?? 0;

	return (
		<>
			<DialogHeader className="border-border border-b p-4">
				<DialogTitle>Participants who read this book</DialogTitle>
				<DialogDescription>
					{bookTitle ? (
						<span className="line-clamp-2">{bookTitle}</span>
					) : (
						<span>
							{readCount === 1
								? "1 participant marked this book read."
								: `${readCount} participants marked this book read.`}
						</span>
					)}
					{participantCount > 0 ? (
						<span className="mt-1 block text-xs">
							Among {participantCount} sitting participants.
						</span>
					) : null}
				</DialogDescription>
			</DialogHeader>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{query.isPending ? (
					<div className="flex flex-col gap-2" aria-hidden>
						{Array.from({ length: 4 }, (_, index) => (
							<Skeleton key={index} className="h-16 w-full" />
						))}
					</div>
				) : query.isError ? (
					<p className="text-destructive text-sm">{query.error?.message}</p>
				) : readers.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No participants have marked this book read yet.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{readers.map((entry) => (
							<li
								key={`${entry.user.username}-${entry.readRecordedAt.toString()}`}
							>
								<Link
									href={`/users/${entry.user.username}` as Route}
									className="flex flex-col gap-1 border px-3 py-2 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
								>
									<UserPanel user={entry.user} className="min-w-0" />
									<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
										Marked read {formatDateTime(entry.readRecordedAt)}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
}

export function PollOptionReadersDialog(props: PollOptionReadersDialogProps) {
	const { readCount, onDismiss } = props;

	const open =
		props.source === "poll" ? props.pollOptionId != null : props.bookId != null;

	const pollQuery = useQuery({
		...orpc.sitting.getPollOptionReaders.queryOptions({
			input: {
				pollOptionId:
					props.source === "poll" && props.pollOptionId != null
						? props.pollOptionId
						: PLACEHOLDER_UUID,
			},
		}),
		enabled: props.source === "poll" && props.pollOptionId != null,
	});

	const previewQuery = useQuery({
		...orpc.sitting.getSittingPollPreviewReaders.queryOptions({
			input: {
				bookId:
					props.source === "preview" && props.bookId != null
						? props.bookId
						: PLACEHOLDER_UUID,
				participantUserIds:
					props.source === "preview" ? props.participantUserIds : [],
			},
		}),
		enabled: props.source === "preview" && props.bookId != null,
	});

	const query = props.source === "poll" ? pollQuery : previewQuery;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onDismiss();
				}
			}}
		>
			<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<ReadersDialogBody readCount={readCount} query={query} />
			</DialogContent>
		</Dialog>
	);
}
