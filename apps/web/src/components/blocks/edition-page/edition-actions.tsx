"use client";

import type {
	EditionCore,
	EditionPage,
} from "@bbrc/api/modules/edition/edition.schema";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, BookCheck, BookOpen, Check } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
	editionChoiceFor,
	findMemberEdition,
} from "@/lib/edition/member-edition";
import {
	useSetReadingEdition,
	useStartReading,
} from "@/lib/reading/use-reading";
import { orpc, queryClient } from "@/utils/orpc";

const BookMarkReadDialog = dynamic(
	() =>
		import("@/components/blocks/book-mark-read-dialog").then(
			(mod) => mod.BookMarkReadDialog,
		),
	{ ssr: false },
);

function refreshEditionQueries() {
	void queryClient.invalidateQueries({ queryKey: orpc.edition.key() });
}

/**
 * What the signed-in member can do with this edition: start reading it, switch
 * their current reading to it, or say they read it. Signed-out visitors get a
 * sign-in prompt and nothing else.
 */
export function EditionActions({
	book,
	edition,
}: {
	book: EditionPage["book"];
	edition: EditionCore;
}) {
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const [readOpen, setReadOpen] = useState(false);
	const [confirm, setConfirm] = useState<"start" | "switch" | null>(null);

	const viewer = useQuery({
		...orpc.edition.viewer.queryOptions({
			input: { bookSlug: book.slug, key: edition.key },
		}),
		enabled: signedIn,
		retry: false,
	});
	const members = useQuery({
		...orpc.bookEdition.list.queryOptions({ input: { bookSlug: book.slug } }),
		enabled: signedIn && edition.source === "member",
	});
	const start = useStartReading(book.slug);
	const switchEdition = useSetReadingEdition();

	const member =
		edition.source === "member"
			? findMemberEdition(members.data?.items ?? [], edition)
			: null;
	const choice = editionChoiceFor(edition, member);
	const memberReady = edition.source !== "member" || member != null;

	if (!signedIn) {
		return (
			<div className="flex flex-wrap items-center gap-3 border border-border border-dashed p-3 text-sm">
				<span className="text-muted-foreground">
					Reading this edition? Sign in to track it.
				</span>
				<Button
					size="sm"
					variant="outline"
					nativeButton={false}
					render={<Link href={"/sign-in" as Route} />}
				>
					Sign in
				</Button>
			</div>
		);
	}

	if (viewer.isPending) {
		return <Skeleton className="h-12 w-full" aria-hidden />;
	}
	if (viewer.isError || !viewer.data) return null;
	const state = viewer.data;

	function begin() {
		start.mutate(
			{
				bookSlug: book.slug,
				editionOlid: choice.editionOlid,
				editionCoverId: choice.editionCoverId,
				editionLabel: choice.editionLabel,
				bookEditionId: choice.bookEditionId,
				totalPages: choice.totalPages,
			},
			{
				onSuccess: () => {
					toast.success("You're reading this edition");
					refreshEditionQueries();
				},
			},
		);
	}

	function switchTo() {
		if (!state.readingId) return;
		switchEdition.mutate(
			{
				id: state.readingId,
				editionOlid: choice.editionOlid,
				editionCoverId: choice.editionCoverId,
				editionLabel: choice.editionLabel,
				bookEditionId: choice.bookEditionId,
				totalPages: choice.totalPages,
			},
			{
				onSuccess: () => {
					toast.success("Your reading now uses this edition");
					refreshEditionQueries();
				},
			},
		);
	}

	return (
		<>
			<div className="flex flex-wrap items-center gap-2 border border-border bg-card p-3">
				{state.readThis ? (
					<span className="inline-flex items-center gap-2 px-1 font-medium text-sm">
						<Check className="size-4 text-success-ink" aria-hidden />
						You read this edition
					</span>
				) : state.readingThis ? (
					<>
						<span className="inline-flex items-center gap-2 px-1 font-medium text-sm">
							<BookOpen className="size-4" aria-hidden />
							You're reading this edition
						</span>
						<Button type="button" size="sm" onClick={() => setReadOpen(true)}>
							<BookCheck data-icon="inline-start" aria-hidden />I finished it
						</Button>
					</>
				) : (
					<>
						{!state.hasReadBook && !state.readingOtherEdition ? (
							<Button
								type="button"
								size="sm"
								disabled={!memberReady || start.isPending}
								onClick={() => setConfirm("start")}
							>
								<BookOpen data-icon="inline-start" aria-hidden />
								I'm reading this edition
							</Button>
						) : null}
						{state.readingOtherEdition ? (
							<Button
								type="button"
								size="sm"
								disabled={!memberReady || switchEdition.isPending}
								onClick={() => setConfirm("switch")}
							>
								<ArrowLeftRight data-icon="inline-start" aria-hidden />
								Switch my reading to this edition
							</Button>
						) : null}
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!memberReady}
							onClick={() => setReadOpen(true)}
						>
							<BookCheck data-icon="inline-start" aria-hidden />
							{state.hasReadBook
								? "I read this edition instead"
								: "I read this edition"}
						</Button>
					</>
				)}
			</div>
			<AlertDialog
				open={confirm != null}
				onOpenChange={(next) => {
					if (!next) setConfirm(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirm === "switch"
								? "Switch your reading to this edition?"
								: "Start reading this edition?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="block font-medium text-foreground">
								{book.title}
							</span>
							<span className="block">
								{choice.editionLabel ?? edition.title ?? "This edition"}
								{choice.totalPages ? ` · ${choice.totalPages} pages` : ""}
							</span>
							<span className="mt-2 block">
								{confirm === "switch"
									? "Your place in the book stays the same; only the edition and its page count change."
									: "It appears on your home feed and, if you are in the sitting for this book, shows as in progress there. It stays on your wishlist until you finish it."}
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								const action = confirm;
								setConfirm(null);
								if (action === "switch") switchTo();
								else begin();
							}}
						>
							{confirm === "switch" ? "Switch edition" : "Start reading"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{readOpen ? (
				<BookMarkReadDialog
					bookSlug={book.slug}
					bookTitle={book.title}
					open={readOpen}
					onOpenChange={(next) => {
						setReadOpen(next);
						if (!next) refreshEditionQueries();
					}}
					edition={{
						editionOlid: choice.editionOlid,
						bookEditionId: choice.bookEditionId,
						label: edition.title ?? choice.editionLabel,
					}}
				/>
			) : null}
		</>
	);
}
