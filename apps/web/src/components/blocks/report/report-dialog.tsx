"use client";

import {
	REPORT_NOTE_MAX,
	REPORT_REASON_DESCRIPTIONS,
	REPORT_REASON_LABELS,
	REPORT_REASONS,
	REPORT_TARGET_LABELS,
	type ReportReason,
	type ReportTargetKind,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { RadioGroup, RadioGroupItem } from "@bbrc/ui/components/radio-group";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

type ReportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	target: ReportTargetKind;
	/** A slug, a username, or `username/shelf-slug`. */
	reference: string;
};

type Sent = { ownerUsername: string | null; already: boolean };

/** Asks why, sends the report, then offers to block the person. Closing it never loses anything already sent. */
export function ReportDialog({
	open,
	onOpenChange,
	target,
	reference,
}: ReportDialogProps) {
	const id = useId();
	const [reason, setReason] = useState<ReportReason | null>(null);
	const [note, setNote] = useState("");
	const [sent, setSent] = useState<Sent | null>(null);

	const report = useMutation(
		orpc.report.create.mutationOptions({
			onSuccess: (data) =>
				setSent({
					ownerUsername: data.ownerUsername,
					already: data.alreadyReported,
				}),
			onError: (error) =>
				toast.error(error.message ?? "Could not send the report."),
		}),
	);
	const block = useMutation(
		orpc.friend.block.mutationOptions({
			onSuccess: () => {
				toast.success("Blocked. You will no longer see each other.");
				close();
			},
			onError: (error) =>
				toast.error(error.message ?? "Could not block this member."),
		}),
	);

	const what = REPORT_TARGET_LABELS[target].toLowerCase();

	function close() {
		onOpenChange(false);
		// Reset after the closing animation, so the text does not flash.
		setTimeout(() => {
			setReason(null);
			setNote("");
			setSent(null);
			report.reset();
		}, 200);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (report.isPending || block.isPending) return;
				if (next) onOpenChange(true);
				else close();
			}}
		>
			<DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto sm:max-w-md">
				{sent ? (
					<>
						<DialogHeader className="items-start gap-3 text-left">
							<CircleCheck className="size-7 text-success-ink" aria-hidden />
							<DialogTitle>
								{sent.already ? "You already reported this" : "Report sent"}
							</DialogTitle>
							<DialogDescription>
								{sent.already
									? `The moderators have your report about this ${what}. There is nothing more to do.`
									: `The moderators will look at this ${what}. We will tell you when they have.`}
							</DialogDescription>
						</DialogHeader>
						{sent.ownerUsername ? (
							<div className="flex flex-col gap-1 border border-border bg-muted/40 p-4">
								<p className="font-medium text-sm">
									Not seeing @{sent.ownerUsername} again?
								</p>
								<p className="text-muted-foreground text-sm">
									Block them and neither of you will see the other in the app.
									You can undo it any time in Friends.
								</p>
							</div>
						) : null}
						<DialogFooter>
							<Button type="button" variant="outline" onClick={close}>
								Done
							</Button>
							{sent.ownerUsername ? (
								<LoadingButton
									type="button"
									variant="destructive"
									loading={block.isPending}
									onClick={() =>
										block.mutate({ username: sent.ownerUsername as string })
									}
								>
									Block @{sent.ownerUsername}
								</LoadingButton>
							) : null}
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader className="text-left">
							<DialogTitle>Report this {what}</DialogTitle>
							<DialogDescription>
								Only the moderators see your report. The member is not told who
								sent it.
							</DialogDescription>
						</DialogHeader>

						<FieldSet>
							<FieldLegend variant="label">What is wrong with it?</FieldLegend>
							<RadioGroup
								value={reason ?? ""}
								onValueChange={(value) => setReason(value as ReportReason)}
								className="grid-cols-1 gap-2"
							>
								{REPORT_REASONS.map((value) => (
									<FieldLabel key={value} htmlFor={`${id}-${value}`}>
										<Field orientation="horizontal">
											<FieldContent>
												<FieldTitle>{REPORT_REASON_LABELS[value]}</FieldTitle>
												<FieldDescription>
													{REPORT_REASON_DESCRIPTIONS[value]}
												</FieldDescription>
											</FieldContent>
											<RadioGroupItem id={`${id}-${value}`} value={value} />
										</Field>
									</FieldLabel>
								))}
							</RadioGroup>
						</FieldSet>

						<Field>
							<FieldLabel htmlFor={`${id}-note`}>Add details</FieldLabel>
							<Textarea
								id={`${id}-note`}
								value={note}
								maxLength={REPORT_NOTE_MAX}
								rows={3}
								placeholder="Optional. What should the moderators look at?"
								onChange={(event) => setNote(event.target.value)}
							/>
							<FieldDescription className="text-right tabular-nums">
								{note.length} of {REPORT_NOTE_MAX}
							</FieldDescription>
						</Field>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={close}>
								Cancel
							</Button>
							<LoadingButton
								type="button"
								loading={report.isPending}
								disabled={!reason}
								onClick={() => {
									if (!reason) return;
									report.mutate({
										target,
										ref: reference,
										reason,
										note: note.trim() || undefined,
									});
								}}
							>
								Send report
							</LoadingButton>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
