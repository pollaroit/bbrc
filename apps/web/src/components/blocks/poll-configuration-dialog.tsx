"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	getPollConfigurationRows,
	type SittingPollConfiguration,
} from "@/lib/poll-configuration";

type PollConfigurationDialogProps = {
	poll: SittingPollConfiguration;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function PollConfigurationDialog({
	poll,
	open,
	onOpenChange,
}: PollConfigurationDialogProps) {
	const rows = getPollConfigurationRows(poll);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 p-0 sm:max-w-md">
				<DialogHeader className="border-border border-b px-4 py-4 text-left">
					<DialogTitle>Poll configuration</DialogTitle>
					<DialogDescription>
						Wishlist pool and ballot rules saved when this sitting started.
					</DialogDescription>
				</DialogHeader>
				<dl className="flex flex-col">
					{rows.map((row, index) => (
						<div
							key={row.label}
							className={
								index > 0 ? "border-border border-t px-4 py-3.5" : "px-4 py-3.5"
							}
						>
							<dt className="text-muted-foreground text-xs">{row.label}</dt>
							<dd className="mt-1 font-medium text-sm leading-snug">
								{row.value}
							</dd>
						</div>
					))}
				</dl>
			</DialogContent>
		</Dialog>
	);
}
