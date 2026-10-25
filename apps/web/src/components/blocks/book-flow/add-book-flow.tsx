"use client";

import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminRequestsInboxSheet } from "@/components/blocks/book-requests/admin-requests-inbox";
import { fetchOpenLibraryWorkByOlid } from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { orpc, queryClient } from "@/utils/orpc";
import {
	type AddBookSavedResult,
	AddBookWorkspaceForm,
	type PendingRequestInfo,
} from "./add-book-workspace-form";
import { useAfterAddPreferences } from "./after-add-options";
import { BookFinder } from "./book-finder";
import { HotkeyHelpDialog, HotkeyHintBar } from "./book-flow-hotkeys-help";
import { BookQueuePanel } from "./book-queue";
import { isPickable, workStatus } from "./book-result-card";
import { useBookFlowHotkeys } from "./use-book-flow-hotkeys";
import { type QueueItem, useBookQueue } from "./use-book-queue";
import { useBookSearch } from "./use-book-search";

/*
 * /books/new for admins, start to finish.
 *
 * Stage 1: the finder (title, link or ISBN), what members want, the discover
 * lanes, the browser queue and the requests inbox. Stage 2: the workspace for
 * the chosen book. The search lives up here, so its results stay behind the
 * form and `[` / `]` can move to the neighbouring result.
 *
 * `?olid=` opens a book straight away (used by "Add" in the inbox, the
 * discover lanes and the request board).
 */

const DiscoverPanel = dynamic(
	() =>
		import("@/components/blocks/book-requests/discover-panel").then(
			(mod) => mod.DiscoverPanel,
		),
	{
		ssr: false,
		loading: () => <Skeleton className="h-64 w-full" aria-hidden />,
	},
);

const AdminRequestsInbox = dynamic(
	() =>
		import("@/components/blocks/book-requests/admin-requests-inbox").then(
			(mod) => mod.AdminRequestsInbox,
		),
	{
		ssr: false,
		loading: () => <Skeleton className="h-64 w-full" aria-hidden />,
	},
);

export function AddBookFlow() {
	const router = useRouter();
	const search = useBookSearch();
	const queue = useBookQueue();
	const [prefs, setPrefs] = useAfterAddPreferences("add");
	const [prefillOlid, setPrefillOlid] = useQueryState("olid", parseAsString);
	const [selected, setSelected] = useState<OpenLibrarySearchWork | null>(null);
	const [helpOpen, setHelpOpen] = useState(false);

	const { data: catalogData } = useQuery({
		...orpc.book.listCatalogOlids.queryOptions(),
		staleTime: 60_000,
	});
	const { data: pendingRequests } = useQuery({
		...orpc.bookRequest.listPending.queryOptions(),
		staleTime: 30_000,
	});
	const { data: blockedData } = useQuery({
		...orpc.book.listBlockedOpenLibraryWorks.queryOptions(),
		staleTime: 60_000,
	});

	const inCatalogOlids = useMemo(() => {
		const set = new Set<string>();
		for (const olid of catalogData?.olids ?? []) {
			set.add(openLibraryWorkKeyToOlid(olid) ?? olid.toUpperCase());
		}
		return set;
	}, [catalogData?.olids]);

	const blockedOlids = useMemo(
		() => new Set((blockedData?.items ?? []).map((item) => item.olid)),
		[blockedData?.items],
	);

	const pendingByOlid = useMemo(() => {
		const map = new Map<string, string>();
		for (const item of pendingRequests?.items ?? []) {
			map.set(
				item.olid.toUpperCase(),
				item.requester.name?.trim() || item.requester.username,
			);
		}
		return map;
	}, [pendingRequests?.items]);

	const pendingInfoByOlid = useMemo(() => {
		const map = new Map<string, PendingRequestInfo>();
		for (const item of pendingRequests?.items ?? []) {
			map.set(item.olid.toUpperCase(), {
				id: item.id,
				olid: item.olid,
				requester: item.requester,
				note: item.note,
				upvoteCount: item.upvoteCount,
			});
		}
		return map;
	}, [pendingRequests?.items]);

	const pickable = useCallback(
		(work: OpenLibrarySearchWork) =>
			isPickable(
				workStatus(work, { inCatalogOlids, pendingByOlid, blockedOlids }),
				"add",
			),
		[inCatalogOlids, pendingByOlid, blockedOlids],
	);

	const focusSearch = useCallback(() => {
		requestAnimationFrame(() => search.inputRef.current?.focus());
	}, [search.inputRef]);

	// ── Opening a book ──────────────────────────────────────────────────────
	const open = useCallback(
		(work: OpenLibrarySearchWork) => {
			const olid = openLibraryWorkKeyToOlid(work.workKey);
			if (!olid) {
				toast.error("That Open Library work could not be linked. Try another.");
				return;
			}
			if (inCatalogOlids.has(olid)) {
				toast.error("This book is already in the library.");
				return;
			}
			setSelected(work);
		},
		[inCatalogOlids],
	);

	const prefill = useQuery({
		queryKey: ["open-library-work-by-olid", prefillOlid],
		queryFn: () => fetchOpenLibraryWorkByOlid(prefillOlid ?? ""),
		enabled: prefillOlid != null,
		staleTime: 3600_000,
		retry: false,
	});

	useEffect(() => {
		if (prefillOlid == null) return;
		if (prefill.isError || (prefill.isSuccess && !prefill.data)) {
			toast.error("Could not load that book from Open Library.");
			void setPrefillOlid(null);
			return;
		}
		if (prefill.data) {
			open(prefill.data);
			void setPrefillOlid(null);
		}
	}, [
		prefill.data,
		prefill.isError,
		prefill.isSuccess,
		prefillOlid,
		open,
		setPrefillOlid,
	]);

	const openQueueItem = useCallback(
		async (item: QueueItem) => {
			queue.select(item.id);
			if (item.kind === "work") {
				open(item.work);
				return;
			}
			const [first] = await search.resolveNow(item.query);
			if (first) {
				open(first);
				return;
			}
			toast.error(`Could not find “${item.query}” on Open Library.`);
			queue.remove(item.id);
			setSelected(null);
		},
		[open, queue, search],
	);

	// ── Leaving a book ──────────────────────────────────────────────────────
	const backToResults = useCallback(() => {
		setSelected(null);
		focusSearch();
	}, [focusSearch]);

	const backToEmptySearch = useCallback(() => {
		setSelected(null);
		search.reset();
		focusSearch();
	}, [focusSearch, search]);

	const switchBook = useCallback(
		(delta: 1 | -1) => {
			if (!selected) return;
			const current = queue.current;
			if (current && queue.count > 1) {
				const index = queue.items.findIndex((item) => item.id === current.id);
				const target = queue.items[index + delta];
				if (target) {
					void openQueueItem(target);
					return;
				}
			}
			const neighbor = search.neighbor(selected.workKey, delta, pickable);
			if (neighbor) setSelected(neighbor);
		},
		[openQueueItem, pickable, queue, search, selected],
	);

	const canSwitch = useMemo(() => {
		if (!selected) return { previous: false, next: false };
		const current = queue.current;
		if (current && queue.count > 1) {
			const index = queue.items.findIndex((item) => item.id === current.id);
			return { previous: index > 0, next: index < queue.items.length - 1 };
		}
		return {
			previous: search.neighbor(selected.workKey, -1, pickable) != null,
			next: search.neighbor(selected.workKey, 1, pickable) != null,
		};
	}, [pickable, queue, search, selected]);

	const nextPending = useMutation({
		mutationFn: async (savedOlid: string) => {
			await queryClient.invalidateQueries({
				queryKey: orpc.bookRequest.listPending.key(),
			});
			const pending = await queryClient.fetchQuery(
				orpc.bookRequest.listPending.queryOptions(),
			);
			return pending.items.find((item) => item.olid !== savedOlid) ?? null;
		},
	});

	const handleSaved = useCallback(
		async (
			result: AddBookSavedResult,
			options: { next: boolean; olid: string; hadPendingRequest: boolean },
		) => {
			// A queue goes on to its next book whatever "After saving" says.
			const current = queue.current;
			if (current) {
				const rest = queue.items.filter((item) => item.id !== current.id);
				queue.finish();
				const following = rest[0];
				if (following) {
					await openQueueItem(following);
					return;
				}
				toast.success("Queue finished.");
			}

			if (options.next) {
				const neighbor = selected
					? search.neighbor(selected.workKey, 1, (work) => {
							const olid = openLibraryWorkKeyToOlid(work.workKey);
							return pickable(work) && olid !== options.olid;
						})
					: null;
				if (neighbor) {
					setSelected(neighbor);
					return;
				}
				toast.message("That was the last result.");
				backToResults();
				return;
			}

			switch (prefs.after) {
				case "open_book":
					router.push(`/books/${result.slug}` as Route);
					return;
				case "keep_results":
					backToResults();
					return;
				case "next_request": {
					const next = await nextPending.mutateAsync(options.olid);
					if (next) {
						setSelected(null);
						await setPrefillOlid(next.olid);
						return;
					}
					toast.message("No more pending requests.");
					backToEmptySearch();
					return;
				}
				default:
					backToEmptySearch();
			}
		},
		[
			backToEmptySearch,
			backToResults,
			nextPending,
			openQueueItem,
			pickable,
			prefs.after,
			queue,
			router,
			search,
			selected,
			setPrefillOlid,
		],
	);

	const blockWork = useMutation(
		orpc.book.blockOpenLibraryWork.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.book.listBlockedOpenLibraryWorks.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookDiscover.lane.key(),
				});
				toast.success("Work blocked. It won't be suggested again.");
				backToResults();
			},
			onError: (error) => toast.error(error.message ?? "Could not block it."),
		}),
	);

	// The page-level `?` shortcut (the form registers its own keys).
	useBookFlowHotkeys(
		{ help: () => setHelpOpen(true) },
		{ stage: "finder", enabled: selected == null },
	);

	const onDiscoverPick = (item: { olid: string }) => {
		void setPrefillOlid(item.olid);
	};
	const onAddFromRequest = (olid: string) => {
		void setPrefillOlid(olid);
	};

	const stage = selected ? "form" : "finder";
	const selectedOlid = selected
		? openLibraryWorkKeyToOlid(selected.workKey)
		: null;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<HotkeyHintBar stage={stage} onOpenHelp={() => setHelpOpen(true)} />
				<div className="xl:hidden">
					<AdminRequestsInboxSheet onAdd={onAddFromRequest} />
				</div>
			</div>

			{selected && selectedOlid ? (
				<AddBookWorkspaceForm
					key={selected.workKey}
					work={selected}
					queue={queue}
					prefs={prefs}
					onPrefsChange={setPrefs}
					pending={pendingInfoByOlid.get(selectedOlid.toUpperCase()) ?? null}
					canSwitch={canSwitch}
					onBack={backToResults}
					onFocusSearch={backToResults}
					onSwitch={switchBook}
					onHelp={() => setHelpOpen(true)}
					onSaved={handleSaved}
					onBlock={() =>
						blockWork.mutate({ olid: selectedOlid, title: selected.title })
					}
				/>
			) : (
				<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="flex min-w-0 flex-col gap-6">
						{prefillOlid != null && prefill.isFetching ? (
							<p className="text-muted-foreground text-sm" role="status">
								Opening the requested book…
							</p>
						) : null}
						<BookFinder
							mode="add"
							search={search}
							onPick={open}
							inCatalogOlids={inCatalogOlids}
							pendingByOlid={pendingByOlid}
							blockedOlids={blockedOlids}
							queue={queue}
							autoFocus
							idleContent={
								<div className="flex flex-col gap-8">
									{queue.count > 0 ? (
										<div className="xl:hidden">
											<BookQueuePanel
												queue={queue}
												allowPaste
												actionLabel="Review"
												onOpen={(item) => void openQueueItem(item)}
											/>
										</div>
									) : null}
									<DiscoverPanel
										isAdmin
										onPick={onDiscoverPick}
										inCatalogOlids={inCatalogOlids}
									/>
									<div className="xl:hidden">
										{queue.count === 0 ? (
											<BookQueuePanel
												queue={queue}
												allowPaste
												actionLabel="Review"
												onOpen={(item) => void openQueueItem(item)}
											/>
										) : null}
									</div>
								</div>
							}
						/>
					</div>
					<aside className="hidden min-w-0 flex-col gap-6 xl:flex">
						<AdminRequestsInbox onAdd={onAddFromRequest} />
						<BookQueuePanel
							queue={queue}
							allowPaste
							actionLabel="Review"
							onOpen={(item) => void openQueueItem(item)}
						/>
					</aside>
				</div>
			)}

			<HotkeyHelpDialog
				open={helpOpen}
				onOpenChange={setHelpOpen}
				stage={stage}
			/>
		</div>
	);
}
