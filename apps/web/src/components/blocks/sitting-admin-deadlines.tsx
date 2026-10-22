"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	calculateSittingReadingDeadline,
	clampSittingDeadlineToClubEnd,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
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
import { CalendarClockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SittingAdminToolRow } from "@/components/blocks/sitting-admin-tool-row";
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { authClient } from "@/lib/auth-client";
import { clubTimeZone } from "@/lib/club-timezone";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc, queryClient } from "@/utils/orpc";

type SittingAdminDeadlinesProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingDeadlinesRow({ sitting }: SittingAdminDeadlinesProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const [pollDeadline, setPollDeadline] = useState(
		sitting.poll?.deadline ?? new Date(),
	);
	const [sittingDeadline, setSittingDeadline] = useState(sitting.deadline);
	const [pageCountInput, setPageCountInput] = useState("");
	const [calculatedDeadlineInPast, setCalculatedDeadlineInPast] =
		useState(false);
	const [suggestion, setSuggestion] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		if (sitting.poll) {
			setPollDeadline(
				clampSittingDeadlineToClubEnd(sitting.poll.deadline, clubTimeZone),
			);
		}

		setSittingDeadline(
			clampSittingDeadlineToClubEnd(sitting.deadline, clubTimeZone),
		);
		setPageCountInput(
			sitting.selectedBook != null ? String(sitting.selectedBook.pages) : "",
		);
		setCalculatedDeadlineInPast(false);
		setSuggestion(null);
	}, [open, sitting.deadline, sitting.poll, sitting.selectedBook]);

	const mutation = useMutation(
		orpc.sitting.updateSittingDeadlines.mutationOptions({
			onSuccess: async () => {
				toast.success("Deadlines updated");
				setOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const savePagesMutation = useMutation(
		orpc.book.updateBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book page count saved");
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.book.getBookBySlug.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	function parsePageCount(): number | null {
		const pages = Number.parseInt(pageCountInput.trim(), 10);
		if (!Number.isFinite(pages) || pages < 1) {
			return null;
		}

		return pages;
	}

	function handleCalculateReadingDeadline() {
		const pages = parsePageCount();
		if (pages == null) {
			toast.error("Enter a valid page count (1 or more).");
			return;
		}

		const raw = calculateSittingReadingDeadline(pages);
		const clamped = clampSittingDeadlineToClubEnd(raw, clubTimeZone);
		setSittingDeadline(clamped);
		setCalculatedDeadlineInPast(
			sitting.status === "reading" && clamped.getTime() < Date.now(),
		);
		setSuggestion(formatDateTime(clamped));
	}

	function handleSaveBookPages() {
		const pages = parsePageCount();
		if (pages == null) {
			toast.error("Enter a valid page count (1 or more).");
			return;
		}

		const bookSlug = sitting.selectedBook?.slug;
		if (!bookSlug) {
			toast.error("This sitting has no selected book yet.");
			return;
		}

		savePagesMutation.mutate({ slug: bookSlug, pages });
	}

	if (isPending || !session?.user.isAdmin) {
		return null;
	}

	const typedPages = parsePageCount();
	const pagesDifferFromBook =
		sitting.selectedBook != null &&
		typedPages != null &&
		typedPages !== sitting.selectedBook.pages;
	const showPoll = sitting.status === "voting" && sitting.poll;

	return (
		<>
			<SittingAdminToolRow
				icon={<CalendarClockIcon />}
				title="Deadlines"
				description={
					<>
						{sitting.poll
							? `Voting ${sitting.status === "voting" ? "closes" : "closed"} ${formatDateTime(sitting.poll.deadline)}. `
							: null}
						{sitting.status === "voting"
							? "Reading deadline is set when reading starts."
							: `Reading ${sitting.status === "finished" ? "ended" : "ends"} ${formatDateTime(sitting.deadline)}.`}
					</>
				}
			>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => setOpen(true)}
				>
					Edit deadlines
				</Button>
			</SittingAdminToolRow>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Deadlines</SheetTitle>
						<SheetDescription>
							Voting and reading deadlines are separate. The reading deadline
							follows the club pace for the book's page count unless you set it
							yourself.
						</SheetDescription>
					</SheetHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
						{showPoll ? (
							<section className="flex flex-col gap-2 border border-border p-3">
								<SittingDeadlinePicker
									mode="poll"
									label="Voting closes"
									value={pollDeadline}
									onChange={setPollDeadline}
								/>
							</section>
						) : (
							<p className="border border-border bg-muted/30 px-3 py-2.5 text-muted-foreground text-sm">
								Voting is closed, so only the reading deadline applies.
							</p>
						)}

						<section className="flex flex-col gap-2 border border-border p-3">
							<SittingDeadlinePicker
								mode="reading"
								label="Reading ends"
								value={sittingDeadline}
								onChange={(value) => {
									setSittingDeadline(value);
									setCalculatedDeadlineInPast(false);
								}}
							/>
						</section>

						<section className="flex flex-col gap-2.5 border border-border p-3">
							<p className="font-medium text-sm">Club pace</p>
							<div className="flex items-end gap-2">
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<Label
										htmlFor="deadline-page-count"
										className="text-muted-foreground text-xs"
									>
										Book pages
									</Label>
									<Input
										id="deadline-page-count"
										type="number"
										min={1}
										inputMode="numeric"
										placeholder="e.g. 320"
										value={pageCountInput}
										onChange={(event) => {
											setPageCountInput(event.target.value);
											setCalculatedDeadlineInPast(false);
											setSuggestion(null);
										}}
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={handleCalculateReadingDeadline}
								>
									Suggest
								</Button>
							</div>

							{suggestion ? (
								<p
									className={
										calculatedDeadlineInPast
											? "text-amber-600 text-xs dark:text-amber-500"
											: "text-muted-foreground text-xs"
									}
								>
									At club pace, reading ends {suggestion}.{" "}
									{calculatedDeadlineInPast
										? "That's already past — adjust it above."
										: "Applied above; save to keep it."}
								</p>
							) : null}

							{pagesDifferFromBook ? (
								<div className="flex items-center justify-between gap-2 border-border border-t pt-2.5">
									<p className="text-muted-foreground text-xs">
										The book is listed with {sitting.selectedBook?.pages} pages.
									</p>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={savePagesMutation.isPending}
										onClick={handleSaveBookPages}
									>
										Update book
									</Button>
								</div>
							) : null}
						</section>
					</div>

					<SheetFooter className="border-border border-t">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="button"
							loading={mutation.isPending}
							onClick={() =>
								mutation.mutate({
									slug: sitting.slug,
									pollDeadline: showPoll ? pollDeadline : undefined,
									sittingDeadline,
								})
							}
						>
							Save deadlines
						</LoadingButton>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}

export function SittingDeadlinesSummary({
	sitting,
}: {
	sitting: GetSittingBySlugOutput;
}) {
	const showPollDeadline = sitting.status === "voting" && sitting.poll;

	return (
		<dl
			className={
				showPollDeadline
					? "grid grid-cols-1 gap-3 sm:grid-cols-2"
					: "grid grid-cols-1 gap-3"
			}
		>
			{showPollDeadline && sitting.poll ? (
				<div>
					<dt className="text-muted-foreground text-xs">Poll deadline</dt>
					<dd className="font-medium">
						{formatDateTime(sitting.poll.deadline)}
					</dd>
				</div>
			) : null}
			<div>
				<dt className="text-muted-foreground text-xs">Reading deadline</dt>
				<dd className="font-medium">
					{sitting.status === "voting"
						? "Set when reading starts"
						: formatDateTime(sitting.deadline)}
				</dd>
			</div>
		</dl>
	);
}
