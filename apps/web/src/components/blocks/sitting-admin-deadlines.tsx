"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	calculateSittingReadingDeadline,
	clampSittingDeadlineToClubEnd,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
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
		toast.success("Reading deadline updated in this form — save to persist.");
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

						<section className="flex flex-col gap-3 border border-border p-3">
							<div>
								<p className="font-medium text-sm">Club pace</p>
								<p className="text-muted-foreground text-xs leading-relaxed">
									Work out the reading deadline from the book's pages. "Use club
									pace" only fills the form above; "Save pages" updates the book
									for future sittings.
								</p>
							</div>
							<InputGroup className="h-auto min-h-8">
								<InputGroupInput
									type="number"
									min={1}
									inputMode="numeric"
									placeholder="Pages"
									value={pageCountInput}
									onChange={(event) => {
										setPageCountInput(event.target.value);
										setCalculatedDeadlineInPast(false);
									}}
									aria-label="Page count for reading schedule"
								/>
								<InputGroupAddon align="inline-end" className="gap-1 pr-1">
									<InputGroupButton
										type="button"
										variant="outline"
										onClick={handleCalculateReadingDeadline}
									>
										Use club pace
									</InputGroupButton>
									<InputGroupButton
										type="button"
										variant="outline"
										disabled={
											savePagesMutation.isPending ||
											sitting.selectedBook == null
										}
										onClick={handleSaveBookPages}
									>
										Save pages
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
							{sitting.selectedBook == null ? (
								<p className="text-muted-foreground text-xs">
									Saving pages is available once a book is chosen.
								</p>
							) : null}
							{calculatedDeadlineInPast ? (
								<p className="text-amber-600 text-xs dark:text-amber-500">
									That deadline is already in the past. Adjust it before saving.
								</p>
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
