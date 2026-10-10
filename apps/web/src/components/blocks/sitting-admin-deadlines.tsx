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
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { authClient } from "@/lib/auth-client";
import { clubTimeZone } from "@/lib/club-timezone";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc, queryClient } from "@/utils/orpc";

type SittingAdminDeadlinesProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingAdminDeadlines({ sitting }: SittingAdminDeadlinesProps) {
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

	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				<CalendarClockIcon data-icon="inline-start" />
				Edit deadlines
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex flex-col gap-0">
					<SheetHeader>
						<SheetTitle>Deadlines</SheetTitle>
						<SheetDescription>
							Poll and reading deadlines are independent. Reading deadline is
							auto-calculated from page count when reading starts; you can
							override it here.
						</SheetDescription>
					</SheetHeader>
					<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
						{sitting.status === "voting" && sitting.poll ? (
							<SittingDeadlinePicker
								mode="poll"
								label="Poll deadline"
								value={pollDeadline}
								onChange={setPollDeadline}
							/>
						) : null}
						{sitting.status !== "voting" ? (
							<p className="text-muted-foreground text-sm">
								Poll voting is closed — only the reading deadline applies now.
							</p>
						) : null}
						<SittingDeadlinePicker
							mode="reading"
							label="Reading deadline"
							value={sittingDeadline}
							onChange={(value) => {
								setSittingDeadline(value);
								setCalculatedDeadlineInPast(false);
							}}
						/>
						<div className="flex flex-col gap-2">
							<p className="font-medium text-sm">Page count</p>
							<p className="text-muted-foreground text-xs">
								Calculate updates the reading deadline in this sheet only (club
								reading rules). Save PP updates the library book for future
								sittings.
							</p>
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
										Calculate
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
										Save PP
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
							{sitting.selectedBook == null ? (
								<p className="text-muted-foreground text-xs">
									Save PP is available after a book is selected for this
									sitting.
								</p>
							) : null}
							{calculatedDeadlineInPast ? (
								<p className="text-amber-600 text-xs dark:text-amber-500">
									Calculated deadline is in the past. Adjust manually or confirm
									before saving.
								</p>
							) : null}
						</div>
					</div>
					<SheetFooter className="border-border border-t">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={mutation.isPending}
							onClick={() =>
								mutation.mutate({
									slug: sitting.slug,
									pollDeadline:
										sitting.status === "voting" && sitting.poll
											? pollDeadline
											: undefined,
									sittingDeadline,
								})
							}
						>
							Save
						</Button>
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
