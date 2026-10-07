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
import { useMutation } from "@tanstack/react-query";
import { BarChart3Icon, BookOpenIcon, FlagIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
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

	const pollOptions = useMemo(() => {
		if (!sitting.poll?.options) return [];
		return [...sitting.poll.options].sort((a, b) => b.voteCount - a.voteCount);
	}, [sitting.poll?.options]);

	const selectedPollOption = useMemo(
		() => pollOptions.find((option) => option.id === selectedOptionId) ?? null,
		[pollOptions, selectedOptionId],
	);

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

	const resendTelegramPollOpen = useMutation(
		orpc.sitting.resendSittingTelegramPollOpen.mutationOptions({
			onSuccess: () => {
				toast.success("Poll open announcement sent to Telegram");
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const sendTelegramProgressPoll = useMutation(
		orpc.sitting.sendSittingTelegramProgressPoll.mutationOptions({
			onSuccess: () => {
				toast.success("Progress poll sent to Telegram");
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

	return (
		<div className="flex flex-wrap gap-2">
			{sitting.status === "voting" && sitting.poll ? (
				<>
					<LoadingButton
						type="button"
						size="sm"
						variant="outline"
						loading={resendTelegramPollOpen.isPending}
						onClick={() =>
							resendTelegramPollOpen.mutate({ slug: sitting.slug })
						}
					>
						<SendIcon data-icon="inline-start" />
						Announce poll on Telegram
					</LoadingButton>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							setSelectedOptionId(pollOptions[0]?.id ?? null);
							setStartOpen(true);
						}}
					>
						<BookOpenIcon data-icon="inline-start" />
						Close poll & start reading
					</Button>
					<Sheet
						open={startOpen}
						onOpenChange={(next) => {
							if (startReading.isPending) return;
							setStartOpen(next);
							if (!next) {
								setStartConfirmOpen(false);
							}
						}}
					>
						<SheetContent
							side="right"
							className="flex flex-col gap-0 sm:max-w-md"
						>
							<SheetHeader>
								<SheetTitle>Start reading phase</SheetTitle>
								<SheetDescription>
									Choose the book the club will read. This closes voting and
									locks the poll. You cannot reopen the poll afterward.
								</SheetDescription>
							</SheetHeader>
							<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
								<fieldset className="flex flex-col gap-2">
									<legend className="sr-only">Winning poll option</legend>
									{pollOptions.map((option) => (
										<label
											key={option.id}
											className="flex cursor-pointer items-start gap-3 border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
										>
											<input
												type="radio"
												name="selectedPollOption"
												className="mt-1"
												checked={selectedOptionId === option.id}
												onChange={() => setSelectedOptionId(option.id)}
											/>
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="font-medium text-sm">
													{option.book.title}
												</span>
												<span className="text-muted-foreground text-xs">
													{option.voteCount} vote
													{option.voteCount === 1 ? "" : "s"}
												</span>
											</span>
										</label>
									))}
								</fieldset>
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
									Start reading
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
					<LoadingButton
						type="button"
						size="sm"
						variant="outline"
						loading={sendTelegramProgressPoll.isPending}
						onClick={() =>
							sendTelegramProgressPoll.mutate({ slug: sitting.slug })
						}
					>
						<BarChart3Icon data-icon="inline-start" />
						Send Telegram progress poll
					</LoadingButton>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={() => setFinishOpen(true)}
					>
						<FlagIcon data-icon="inline-start" />
						Mark sitting finished
					</Button>
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
		</div>
	);
}
