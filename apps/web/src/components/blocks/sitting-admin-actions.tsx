"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { useMutation } from "@tanstack/react-query";
import { BookOpenIcon, FlagIcon } from "lucide-react";
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
	const [finishOpen, setFinishOpen] = useState(false);
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

	const pollOptions = useMemo(() => {
		if (!sitting.poll?.options) return [];
		return [...sitting.poll.options].sort((a, b) => b.voteCount - a.voteCount);
	}, [sitting.poll?.options]);

	const startReading = useMutation(
		orpc.sitting.transitionSitting.mutationOptions({
			onSuccess: async () => {
				toast.success("Reading phase started");
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

	return (
		<div className="flex flex-wrap gap-2">
			{sitting.status === "voting" && sitting.poll ? (
				<>
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
					<Sheet open={startOpen} onOpenChange={setStartOpen}>
						<SheetContent side="right" className="flex flex-col gap-0">
							<SheetHeader>
								<SheetTitle>Start reading phase</SheetTitle>
								<SheetDescription>
									Choose the book the club will read. This closes voting and
									locks the poll.
								</SheetDescription>
							</SheetHeader>
							<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
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
								>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={!selectedOptionId || startReading.isPending}
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
								</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</>
			) : null}

			{sitting.status === "reading" ? (
				<>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={() => setFinishOpen(true)}
					>
						<FlagIcon data-icon="inline-start" />
						Mark sitting finished
					</Button>
					<Sheet open={finishOpen} onOpenChange={setFinishOpen}>
						<SheetContent side="right">
							<SheetHeader>
								<SheetTitle>Finish sitting</SheetTitle>
								<SheetDescription>
									Move this sitting to finished. Anyone still reading or not
									started will be marked DNF. Reading points are applied now
									(completed: pages ÷ 10, DNF: −1000 ÷ pages, rounded).
								</SheetDescription>
							</SheetHeader>
							<SheetFooter className="mt-auto">
								<Button
									type="button"
									variant="outline"
									onClick={() => setFinishOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={finishSitting.isPending}
									onClick={() =>
										finishSitting.mutate({
											slug: sitting.slug,
											transition: "finish",
										})
									}
								>
									Finish sitting
								</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</>
			) : null}
		</div>
	);
}
