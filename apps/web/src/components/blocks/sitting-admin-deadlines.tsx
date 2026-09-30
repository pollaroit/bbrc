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
import { CalendarClockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { authClient } from "@/lib/auth-client";
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
							label="Reading deadline"
							value={sittingDeadline}
							onChange={setSittingDeadline}
						/>
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
