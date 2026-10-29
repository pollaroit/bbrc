"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpenIcon, CheckIcon, FlagIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SittingAdminToolRow } from "@/components/blocks/sitting-admin-tool-row";
import { authClient } from "@/lib/auth-client";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type SittingAdminActionsProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingAdminActions({ sitting }: SittingAdminActionsProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [startOpen, setStartOpen] = useState(false);
	const [startConfirmOpen, setStartConfirmOpen] = useState(false);
	const [finishOpen, setFinishOpen] = useState(false);
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
	const [showAllPollOptions, setShowAllPollOptions] = useState(false);

	const isAdmin = session?.user.isAdmin === true;

	const liveSittingQuery = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sitting.slug }),
		enabled: isAdmin && sitting.status === "voting",
	});

	const pollOptions = useMemo(() => {
		const poll = liveSittingQuery.data?.poll ?? sitting.poll;
		if (!poll?.options) {
			return [];
		}

		return [...poll.options].toSorted((a, b) => {
			if (b.pointTotal !== a.pointTotal) {
				return b.pointTotal - a.pointTotal;
			}

			return a.book.title.localeCompare(b.book.title);
		});
	}, [liveSittingQuery.data?.poll, sitting.poll]);

	const pollLeaders = useMemo(() => {
		if (pollOptions.length === 0) {
			return [];
		}

		const maxPoints = pollOptions[0]?.pointTotal ?? 0;
		return pollOptions.filter((option) => option.pointTotal === maxPoints);
	}, [pollOptions]);

	const pollOptionsInSheet = showAllPollOptions ? pollOptions : pollLeaders;

	const selectedPollOption = useMemo(
		() => pollOptions.find((option) => option.id === selectedOptionId) ?? null,
		[pollOptions, selectedOptionId],
	);

	useEffect(() => {
		if (!startOpen || showAllPollOptions || pollLeaders.length === 0) {
			return;
		}

		setSelectedOptionId((current) => {
			if (
				current != null &&
				pollLeaders.some((option) => option.id === current)
			) {
				return current;
			}

			return pollLeaders[0]?.id ?? null;
		});
	}, [startOpen, showAllPollOptions, pollLeaders]);

	function openStartReadingSheet() {
		setShowAllPollOptions(false);
		setSelectedOptionId(pollLeaders[0]?.id ?? pollOptions[0]?.id ?? null);
		setStartOpen(true);
		void liveSittingQuery.refetch();
	}

	const startReading = useMutation(
		orpc.sitting.transitionSitting.mutationOptions({
			onSuccess: async () => {
				toast.success("Reading phase started");
				setStartConfirmOpen(false);
				setStartOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getOngoingSitting.key(),
				});
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const finishSitting = useMutation(
		orpc.sitting.transitionSitting.mutationOptions({
			onSuccess: async () => {
				toast.success("Sitting finished — reading points updated");
				setFinishOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getOngoingSitting.key(),
				});
				await invalidateUserPointQueries();
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	if (isPending || !session?.user.isAdmin) {
		return null;
	}

	if (sitting.status === "finished") {
		return null;
	}

	const topPoints = pollOptions[0]?.pointTotal ?? 0;

	return (
		<>
			{sitting.status === "voting" && sitting.poll ? (
				<>
					<SittingAdminToolRow
						icon={<BookOpenIcon />}
						title="Close voting"
						description="Choose the winner and start the reading phase. The poll is locked afterwards."
					>
						<Button type="button" size="sm" onClick={openStartReadingSheet}>
							Close poll & start reading
						</Button>
					</SittingAdminToolRow>

					<Sheet
						open={startOpen}
						onOpenChange={(next) => {
							if (startReading.isPending) return;
							setStartOpen(next);
							if (!next) {
								setStartConfirmOpen(false);
								setShowAllPollOptions(false);
							}
						}}
					>
						<SheetContent
							side="right"
							className="flex flex-col gap-0 sm:max-w-md"
						>
							<SheetHeader>
								<SheetTitle>Choose the club read</SheetTitle>
								<SheetDescription>
									{pollLeaders.length > 1 && !showAllPollOptions
										? `${pollLeaders.length} books are tied for the lead. Pick one to start reading.`
										: "The highest-scoring book is selected. Pick another if you need to."}{" "}
									Closing voting can't be undone.
								</SheetDescription>
							</SheetHeader>

							<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
								{liveSittingQuery.isFetching &&
								pollOptions.every((o) => o.pointTotal === 0) ? (
									<p className="text-muted-foreground text-xs">
										Loading live vote totals…
									</p>
								) : null}

								<fieldset className="flex flex-col gap-2">
									<legend className="sr-only">Winning poll option</legend>
									{pollOptionsInSheet.map((option) => {
										const selected = selectedOptionId === option.id;
										const leading =
											option.pointTotal === topPoints && topPoints > 0;
										const coverSrc = bookCoverUrl(option.book.coverId);
										return (
											<label
												key={option.id}
												className={cn(
													"relative flex cursor-pointer gap-3 border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
													selected
														? "border-foreground bg-muted/30"
														: "border-border hover:bg-muted/40",
												)}
											>
												<input
													type="radio"
													name="selectedPollOption"
													className="sr-only"
													checked={selected}
													onChange={() => setSelectedOptionId(option.id)}
												/>
												<span className="relative block aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
													{coverSrc ? (
														<Image
															src={coverSrc}
															alt=""
															fill
															className="object-cover"
															sizes="48px"
														/>
													) : null}
												</span>
												<span className="flex min-w-0 flex-1 flex-col gap-1.5">
													<span className="flex items-start justify-between gap-2">
														<span className="font-medium text-sm leading-snug">
															{option.book.title}
														</span>
														{selected ? (
															<CheckIcon
																className="size-4 shrink-0"
																aria-hidden
															/>
														) : null}
													</span>
													<span className="text-muted-foreground text-xs">
														{formatBookAuthors(option.book.authors)}
													</span>
													<span className="flex items-center gap-2 text-xs tabular-nums">
														<span className="font-medium">
															{option.pointTotal} pts
														</span>
														<span className="text-muted-foreground">
															{option.voteCount}{" "}
															{option.voteCount === 1 ? "voter" : "voters"}
														</span>
														{leading ? (
															<span className="border border-border px-1.5 py-0.5 text-3xs">
																Leading
															</span>
														) : null}
													</span>
													<span className="h-1 bg-muted/40">
														<span
															className="block h-full bg-foreground/60"
															style={{
																width: `${topPoints > 0 ? (option.pointTotal / topPoints) * 100 : 0}%`,
															}}
														/>
													</span>
												</span>
											</label>
										);
									})}
								</fieldset>

								{!showAllPollOptions &&
								pollOptions.length > pollLeaders.length ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => setShowAllPollOptions(true)}
									>
										Show all {pollOptions.length} books
									</Button>
								) : null}
								{showAllPollOptions ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="w-fit"
										onClick={() => {
											setShowAllPollOptions(false);
											if (
												selectedOptionId != null &&
												!pollLeaders.some(
													(option) => option.id === selectedOptionId,
												)
											) {
												setSelectedOptionId(pollLeaders[0]?.id ?? null);
											}
										}}
									>
										Show leaders only
									</Button>
								) : null}
							</div>

							<SheetFooter className="border-border border-t">
								<Button
									type="button"
									variant="outline"
									onClick={() => setStartOpen(false)}
									disabled={startReading.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={!selectedOptionId}
									onClick={() => setStartConfirmOpen(true)}
								>
									{selectedPollOption
										? `Start with ${selectedPollOption.book.title.length > 22 ? `${selectedPollOption.book.title.slice(0, 21)}…` : selectedPollOption.book.title}`
										: "Start reading"}
								</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>

					<AlertDialog
						open={startConfirmOpen}
						onOpenChange={(next) => {
							if (startReading.isPending) return;
							setStartConfirmOpen(next);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
								<AlertDialogTitle>Start reading phase?</AlertDialogTitle>
								<AlertDialogDescription>
									{selectedPollOption ? (
										<>
											Close voting and start reading with “
											{selectedPollOption.book.title}”. The poll will be locked
											and cannot be reopened.
										</>
									) : (
										"Close voting and start the reading phase. The poll will be locked and cannot be reopened."
									)}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={startReading.isPending}>
									Cancel
								</AlertDialogCancel>
								<LoadingButton
									type="button"
									loading={startReading.isPending}
									disabled={!selectedOptionId}
									onClick={() => {
										if (!selectedOptionId) return;
										startReading.mutate({
											slug: sitting.slug,
											transition: "start_reading",
											selectedPollOptionId: selectedOptionId,
										});
									}}
								>
									Start reading
								</LoadingButton>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			) : null}

			{sitting.status === "reading" ? (
				<>
					<SittingAdminToolRow
						icon={<FlagIcon />}
						title="Finish sitting"
						description="Locks the results. Anyone still reading or not started is marked as not finished, and reading points are applied."
					>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="text-destructive hover:bg-destructive/10 hover:text-destructive"
							onClick={() => setFinishOpen(true)}
						>
							Finish sitting
						</Button>
					</SittingAdminToolRow>
					<AlertDialog
						open={finishOpen}
						onOpenChange={(next) => {
							if (finishSitting.isPending) return;
							setFinishOpen(next);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
								<AlertDialogTitle>Finish sitting?</AlertDialogTitle>
								<AlertDialogDescription>
									This moves the sitting to finished. Anyone still reading or
									not started will be marked DNF. Reading points are applied now
									(completed: pages ÷ 10, DNF: −1000 ÷ pages, rounded). This
									cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={finishSitting.isPending}>
									Cancel
								</AlertDialogCancel>
								<LoadingButton
									type="button"
									variant="destructive"
									loading={finishSitting.isPending}
									onClick={() =>
										finishSitting.mutate({
											slug: sitting.slug,
											transition: "finish",
										})
									}
								>
									Finish sitting
								</LoadingButton>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			) : null}
		</>
	);
}
