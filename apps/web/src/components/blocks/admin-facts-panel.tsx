"use client";

import type { AdminFactDraft } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Button } from "@bbrc/ui/components/button";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { FactCategoryBadge } from "@/components/blocks/fact-category-badge";
import { consumeAdminFactDraftsStream } from "@/lib/admin-fact-drafts-stream";
import { orpc, queryClient } from "@/utils/orpc";

const GENERATION_COUNT = 10;

type QueueItem = {
	localId: string;
	draft: AdminFactDraft;
	status: "pending" | "rejected" | "saved";
};

async function invalidateAdminFacts() {
	await queryClient.invalidateQueries({ queryKey: orpc.admin.listFacts.key() });
	await queryClient.invalidateQueries({ queryKey: orpc.fact.pullDeck.key() });
}

function draftToCreateItem(draft: AdminFactDraft) {
	return {
		body: draft.fact,
		category: draft.category,
		subcategory: draft.subcategory,
		source: draft.source,
		confidence: draft.confidence,
	};
}

export function AdminFactsPanel() {
	const [topic, setTopic] = useState("");
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [targetCount, setTargetCount] = useState(GENERATION_COUNT);
	const [pendingSlots, setPendingSlots] = useState(0);
	const streamGenerationRef = useRef(0);
	const streamAbortRef = useRef<AbortController | null>(null);

	const batchCreateMutation = useMutation(
		orpc.admin.batchCreateFacts.mutationOptions({
			onSuccess: async (_data, variables) => {
				toast.success(
					variables.publish
						? `Published ${variables.items.length} facts.`
						: `Saved ${variables.items.length} drafts.`,
				);
				await invalidateAdminFacts();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const pendingItems = queue.filter((item) => item.status === "pending");

	const startStream = useCallback(async () => {
		streamAbortRef.current?.abort();
		const controller = new AbortController();
		streamAbortRef.current = controller;

		const generation = streamGenerationRef.current + 1;
		streamGenerationRef.current = generation;
		setStreamError(null);
		setIsStreaming(true);
		setQueue([]);
		setTargetCount(GENERATION_COUNT);
		setPendingSlots(GENERATION_COUNT);

		try {
			await consumeAdminFactDraftsStream({
				count: GENERATION_COUNT,
				topic: topic.trim() === "" ? undefined : topic.trim(),
				signal: controller.signal,
				onEvent: (event) => {
					if (streamGenerationRef.current !== generation) {
						return;
					}

					if (event.type === "meta") {
						setTargetCount(event.targetCount);
						setPendingSlots(event.targetCount);
						return;
					}

					if (event.type === "fact") {
						setPendingSlots((count) => Math.max(0, count - 1));
						setQueue((current) => [
							...current,
							{
								localId: `${event.index}-${crypto.randomUUID()}`,
								draft: event.draft,
								status: "pending",
							},
						]);
						return;
					}

					if (event.type === "error") {
						setPendingSlots((count) => Math.max(0, count - 1));
						toast.error(`Pick ${event.index + 1}: ${event.message}`);
					}
				},
			});
		} catch (error) {
			if (streamGenerationRef.current === generation) {
				const message =
					error instanceof Error ? error.message : "Generation failed";
				setStreamError(message);
			}
		} finally {
			if (streamGenerationRef.current === generation) {
				setIsStreaming(false);
				setPendingSlots(0);
			}
		}
	}, [topic]);

	function rejectItem(localId: string) {
		setQueue((current) =>
			current.map((item) =>
				item.localId === localId ? { ...item, status: "rejected" } : item,
			),
		);
	}

	function rejectAllPending() {
		setQueue((current) =>
			current.map((item) =>
				item.status === "pending" ? { ...item, status: "rejected" } : item,
			),
		);
	}

	async function savePending(publish: boolean, localIds?: string[]) {
		const items = queue.filter(
			(item) =>
				item.status === "pending" &&
				(localIds == null || localIds.includes(item.localId)),
		);

		if (items.length === 0) {
			toast.message("Nothing to save.");
			return;
		}

		await batchCreateMutation.mutateAsync({
			items: items.map((item) => draftToCreateItem(item.draft)),
			publish,
		});

		const savedIds = new Set(items.map((item) => item.localId));
		setQueue((current) =>
			current.filter((item) => !savedIds.has(item.localId)),
		);
	}

	return (
		<div className="flex flex-col gap-10">
			<section className="flex flex-col gap-4 border border-border p-6">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-lg">Generate batch</h2>
					<p className="text-muted-foreground text-sm">
						Streams {GENERATION_COUNT} facts one at a time across mixed
						categories. Reject bad picks, then save or publish the rest in one
						click.
					</p>
				</div>

				<Field>
					<FieldLabel htmlFor="fact-topic">Topic hint (optional)</FieldLabel>
					<Input
						id="fact-topic"
						value={topic}
						onChange={(event) => setTopic(event.target.value)}
						placeholder="e.g. Ottoman libraries, jazz history, marine biology"
					/>
				</Field>

				<div className="flex flex-wrap gap-2">
					<LoadingButton
						type="button"
						loading={isStreaming}
						onClick={() => void startStream()}
					>
						<Sparkles className="size-4" aria-hidden />
						Generate {GENERATION_COUNT}
					</LoadingButton>
					{pendingItems.length > 0 ? (
						<>
							<LoadingButton
								type="button"
								variant="outline"
								loading={batchCreateMutation.isPending}
								onClick={() => void savePending(false)}
							>
								Save all drafts ({pendingItems.length})
							</LoadingButton>
							<LoadingButton
								type="button"
								loading={batchCreateMutation.isPending}
								onClick={() => void savePending(true)}
							>
								Publish all ({pendingItems.length})
							</LoadingButton>
							<Button type="button" variant="ghost" onClick={rejectAllPending}>
								Reject all
							</Button>
						</>
					) : null}
				</div>

				{streamError ? (
					<p className="text-destructive text-sm">{streamError}</p>
				) : null}

				{queue.length === 0 && !isStreaming ? (
					<p className="text-muted-foreground text-sm">
						No generated picks yet. Run a batch to review facts here.
					</p>
				) : (
					<ul className="flex flex-col gap-3">
						{queue
							.filter((item) => item.status !== "rejected")
							.map((item) => (
								<li
									key={item.localId}
									className="flex flex-col gap-3 border border-border p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<p className="font-serif text-base leading-snug">
											{item.draft.fact}
										</p>
										{item.status === "pending" ? (
											<Button
												type="button"
												size="icon-sm"
												variant="ghost"
												aria-label="Reject fact"
												onClick={() => rejectItem(item.localId)}
											>
												<X className="size-4" aria-hidden />
											</Button>
										) : null}
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<FactCategoryBadge category={item.draft.category} />
										<a
											href={item.draft.source}
											target="_blank"
											rel="noopener noreferrer"
											className="truncate text-muted-foreground text-xs underline underline-offset-2"
										>
											Source
										</a>
									</div>
									{item.status === "pending" ? (
										<div className="flex flex-wrap gap-2">
											<LoadingButton
												type="button"
												size="sm"
												variant="outline"
												loading={batchCreateMutation.isPending}
												onClick={() => void savePending(false, [item.localId])}
											>
												Save draft
											</LoadingButton>
											<LoadingButton
												type="button"
												size="sm"
												loading={batchCreateMutation.isPending}
												onClick={() => void savePending(true, [item.localId])}
											>
												Publish
											</LoadingButton>
										</div>
									) : null}
								</li>
							))}
						{isStreaming
							? Array.from({ length: pendingSlots }, (_, index) => (
									<li
										key={`pending-slot-${index}`}
										className="border border-border border-dashed p-4"
									>
										<Skeleton className="h-16 w-full" />
										<p className="mt-2 text-muted-foreground text-xs">
											Generating pick {targetCount - pendingSlots + index + 1}{" "}
											of {targetCount}…
										</p>
									</li>
								))
							: null}
					</ul>
				)}
			</section>
		</div>
	);
}
