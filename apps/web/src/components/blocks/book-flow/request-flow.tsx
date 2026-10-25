"use client";

import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { MyRequestsTimeline } from "@/components/blocks/book-requests/my-requests-timeline";
import { RequestBoard } from "@/components/blocks/book-requests/request-board";
import { RequestNoteField } from "@/components/blocks/book-requests/request-note-field";
import {
	MeTooButton,
	YourRequestTag,
} from "@/components/blocks/book-requests/request-shared";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { fetchOpenLibraryWorkByOlid } from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { orpc, queryClient } from "@/utils/orpc";
import { AfterAddOptions, useAfterAddPreferences } from "./after-add-options";
import { BookFinder } from "./book-finder";
import {
	HotkeyChip,
	HotkeyHelpDialog,
	HotkeyHintBar,
} from "./book-flow-hotkeys-help";
import { BookPreviewCard } from "./book-preview-card";
import { isPickable, workStatus } from "./book-result-card";
import { useBookFlowHotkeys } from "./use-book-flow-hotkeys";
import { useBookSearch } from "./use-book-search";

/*
 * /books/request for members.
 *
 * Stage 1: the finder, "Suggested for you" (and Ask AI), the open requests
 * ranked by "me too" and the member's own requests. Stage 2: a short
 * confirmation with a note ("Why this book?"). Books someone already asked for
 * show a "Me too" button instead of a second request.
 */

const DiscoverPanel = dynamic(
	() =>
		import("@/components/blocks/book-requests/discover-panel").then(
			(mod) => mod.DiscoverPanel,
		),
	{
		ssr: false,
		loading: () => <Skeleton className="h-56 w-full" aria-hidden />,
	},
);

function requireOlid(work: OpenLibrarySearchWork): string {
	const olid = openLibraryWorkKeyToOlid(work.workKey);
	if (!olid) throw new Error("Invalid Open Library work ID");
	return olid;
}

type ConfirmProps = {
	work: OpenLibrarySearchWork;
	canSwitch: { previous: boolean; next: boolean };
	onBack: () => void;
	onSwitch: (delta: 1 | -1) => void;
	onHelp: () => void;
	onDone: (action: "stay" | "keep_results") => void;
	after: "stay" | "keep_results";
	afterValue: ReturnType<typeof useAfterAddPreferences>[0];
	onAfterChange: (next: ReturnType<typeof useAfterAddPreferences>[0]) => void;
};

function RequestConfirm({
	work,
	canSwitch,
	onBack,
	onSwitch,
	onHelp,
	onDone,
	after,
	afterValue,
	onAfterChange,
}: ConfirmProps) {
	const [note, setNote] = useState("");

	const createRequest = useMutation(
		orpc.bookRequest.create.mutationOptions({
			onSuccess: async () => {
				toast.success("Request sent. Admins will take a look.");
				await invalidateUserPointQueries();
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listPending.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listOpen.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listMine.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookDiscover.lane.key(),
				});
				onDone(after);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const submit = useCallback(() => {
		if (createRequest.isPending) return;
		try {
			createRequest.mutate({
				olid: requireOlid(work),
				title: work.title.trim(),
				authors: work.authors,
				note: note.trim() || undefined,
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not prepare request",
			);
		}
	}, [createRequest, note, work]);

	useBookFlowHotkeys(
		{
			save: submit,
			back: onBack,
			focusSearch: onBack,
			help: onHelp,
			previousBook: () => onSwitch(-1),
			nextBook: () => onSwitch(1),
		},
		{ stage: "form" },
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="-ms-2 gap-1.5"
					onClick={onBack}
				>
					<ArrowLeft data-icon="inline-start" aria-hidden />
					Back to results
					<HotkeyChip id="back" />
				</Button>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!canSwitch.previous}
						onClick={() => onSwitch(-1)}
						aria-label="Previous book"
					>
						<ChevronLeft data-icon="inline-start" aria-hidden />
						Previous
						<HotkeyChip id="previousBook" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!canSwitch.next}
						onClick={() => onSwitch(1)}
						aria-label="Next book"
					>
						Next
						<HotkeyChip id="nextBook" />
						<ChevronRight data-icon="inline-end" aria-hidden />
					</Button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
				<BookPreviewCard
					title={work.title}
					authors={work.authors}
					coverId={work.coverId}
					publishedIn={work.publishedIn}
					excerpt={work.description}
					className="mx-auto w-full max-w-72 lg:mx-0"
				/>
				<section className="flex min-w-0 flex-col gap-5">
					<header className="flex flex-col gap-1">
						<h2 className="font-semibold text-lg tracking-tight">
							Request this book
						</h2>
						<p className="max-w-prose text-muted-foreground text-sm">
							Admins review requests and add the ones that fit. Other members
							can say “me too”, and you hear back when it is added or declined.
						</p>
					</header>
					<RequestNoteField value={note} onChange={setNote} />
					<AfterAddOptions
						mode="request"
						value={afterValue}
						onChange={onAfterChange}
					/>
					<div className="flex flex-wrap gap-2">
						<LoadingButton
							type="button"
							loading={createRequest.isPending}
							loadingText="Sending…"
							className="min-w-36"
							onClick={submit}
						>
							Send request
							<HotkeyChip id="save" />
						</LoadingButton>
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							disabled={createRequest.isPending}
						>
							Cancel
						</Button>
					</div>
				</section>
			</div>
		</div>
	);
}

export function RequestFlow() {
	const search = useBookSearch();
	const [prefs, setPrefs] = useAfterAddPreferences("request");
	const [selected, setSelected] = useState<OpenLibrarySearchWork | null>(null);
	const [helpOpen, setHelpOpen] = useState(false);

	const { data: catalogData } = useQuery({
		...orpc.book.listCatalogOlids.queryOptions(),
		staleTime: 60_000,
	});
	const { data: openRequests } = useQuery({
		...orpc.bookRequest.listOpen.queryOptions(),
		staleTime: 30_000,
	});

	const inCatalogOlids = useMemo(() => {
		const set = new Set<string>();
		for (const olid of catalogData?.olids ?? []) {
			set.add(openLibraryWorkKeyToOlid(olid) ?? olid.toUpperCase());
		}
		return set;
	}, [catalogData?.olids]);

	const requestByOlid = useMemo(() => {
		const map = new Map<
			string,
			NonNullable<typeof openRequests>["items"][number]
		>();
		for (const item of openRequests?.items ?? []) {
			map.set(item.olid.toUpperCase(), item);
		}
		return map;
	}, [openRequests]);

	const pendingByOlid = useMemo(() => {
		const map = new Map<string, string>();
		for (const [olid, item] of requestByOlid) {
			map.set(olid, item.requester.name?.trim() || item.requester.username);
		}
		return map;
	}, [requestByOlid]);

	const pendingOlids = useMemo(
		() => new Set(requestByOlid.keys()),
		[requestByOlid],
	);

	const pickable = useCallback(
		(work: OpenLibrarySearchWork) =>
			isPickable(
				workStatus(work, { inCatalogOlids, pendingByOlid }),
				"request",
			),
		[inCatalogOlids, pendingByOlid],
	);

	const focusSearch = useCallback(() => {
		requestAnimationFrame(() => search.inputRef.current?.focus());
	}, [search.inputRef]);

	const open = useCallback(
		(work: OpenLibrarySearchWork) => {
			const olid = openLibraryWorkKeyToOlid(work.workKey);
			if (!olid) {
				toast.error("That Open Library work could not be linked. Try another.");
				return;
			}
			if (inCatalogOlids.has(olid)) {
				toast.message("That book is already in the library.");
				return;
			}
			if (pendingByOlid.has(olid)) {
				toast.message("Someone already asked for it. Say “me too” instead.");
				return;
			}
			setSelected(work);
		},
		[inCatalogOlids, pendingByOlid],
	);

	const openByOlid = useCallback(
		async (olid: string) => {
			try {
				const work = await fetchOpenLibraryWorkByOlid(olid);
				if (!work) {
					toast.error("Could not load that book from Open Library.");
					return;
				}
				open(work);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Could not load that book.",
				);
			}
		},
		[open],
	);

	const backToResults = useCallback(() => {
		setSelected(null);
		focusSearch();
	}, [focusSearch]);

	const switchBook = useCallback(
		(delta: 1 | -1) => {
			if (!selected) return;
			const neighbor = search.neighbor(selected.workKey, delta, pickable);
			if (neighbor) setSelected(neighbor);
		},
		[pickable, search, selected],
	);

	const canSwitch = useMemo(
		() =>
			selected
				? {
						previous: search.neighbor(selected.workKey, -1, pickable) != null,
						next: search.neighbor(selected.workKey, 1, pickable) != null,
					}
				: { previous: false, next: false },
		[pickable, search, selected],
	);

	useBookFlowHotkeys(
		{ help: () => setHelpOpen(true) },
		{ stage: "finder", enabled: selected == null },
	);

	const stage = selected ? "form" : "finder";

	return (
		<div className="flex flex-col gap-8">
			<HotkeyHintBar stage={stage} onOpenHelp={() => setHelpOpen(true)} />

			{selected ? (
				<RequestConfirm
					key={selected.workKey}
					work={selected}
					canSwitch={canSwitch}
					onBack={backToResults}
					onSwitch={switchBook}
					onHelp={() => setHelpOpen(true)}
					after={prefs.after === "keep_results" ? "keep_results" : "stay"}
					afterValue={prefs}
					onAfterChange={setPrefs}
					onDone={(action) => {
						setSelected(null);
						if (action === "keep_results") {
							focusSearch();
							return;
						}
						search.reset();
						focusSearch();
					}}
				/>
			) : (
				<>
					<BookFinder
						mode="request"
						search={search}
						onPick={open}
						inCatalogOlids={inCatalogOlids}
						pendingByOlid={pendingByOlid}
						autoFocus
						resultExtras={(work, status) => {
							if (status.kind !== "requested") return null;
							const olid = openLibraryWorkKeyToOlid(work.workKey);
							const request = olid
								? requestByOlid.get(olid.toUpperCase())
								: undefined;
							if (!request) return null;
							return request.isMine ? (
								<YourRequestTag count={request.upvoteCount} />
							) : (
								<MeTooButton
									requestId={request.id}
									active={request.viewerUpvoted}
									count={request.upvoteCount}
								/>
							);
						}}
						idleContent={
							<DiscoverPanel
								isAdmin={false}
								onPick={(item) => void openByOlid(item.olid)}
								onRequest={(item) => void openByOlid(item.olid)}
								pendingOlids={pendingOlids}
								inCatalogOlids={inCatalogOlids}
							/>
						}
					/>
					<div className="grid gap-10 border-border border-t pt-8 lg:grid-cols-2">
						<section className="flex min-w-0 flex-col gap-3">
							<h2 className="font-semibold text-lg tracking-tight">
								What members are asking for
							</h2>
							<RequestBoard />
						</section>
						<section className="flex min-w-0 flex-col gap-3">
							<h2 className="font-semibold text-lg tracking-tight">
								Your requests
							</h2>
							<MyRequestsTimeline />
						</section>
					</div>
				</>
			)}

			<HotkeyHelpDialog
				open={helpOpen}
				onOpenChange={setHelpOpen}
				stage={stage}
			/>
		</div>
	);
}
