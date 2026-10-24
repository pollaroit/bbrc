"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { SittingReadingRisk } from "@/components/blocks/sitting-reading-risk";
import { useSittingJoinActions } from "@/lib/sitting/join-cache";
import { cn } from "@/lib/utils";

/** A compact Join button for a sitting card. Reading asks for the risk tick first. */
export function SittingCardJoinButton({
	slug,
	status,
	deadline,
	className,
	variant = "outline",
}: {
	slug: string;
	status: "voting" | "reading" | "finished";
	deadline: Date | string;
	className?: string;
	variant?: "outline" | "default";
}) {
	const { join } = useSittingJoinActions(slug);
	const [open, setOpen] = useState(false);
	const [accepted, setAccepted] = useState(false);

	function submit() {
		join.mutate({ sittingSlug: slug });
		setOpen(false);
		setAccepted(false);
	}

	return (
		<>
			<Button
				size="sm"
				variant={variant}
				className={cn("relative z-10", className)}
				disabled={join.isPending}
				onClick={() => (status === "reading" ? setOpen(true) : submit())}
			>
				<UserPlus data-icon="inline-start" aria-hidden />
				Join
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setAccepted(false);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Join while reading is under way?</DialogTitle>
						<DialogDescription>
							Everyone in the sitting is judged at the same deadline.
						</DialogDescription>
					</DialogHeader>
					<SittingReadingRisk
						deadline={deadline}
						checked={accepted}
						onCheckedChange={setAccepted}
					/>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button disabled={!accepted} onClick={submit}>
							Join sitting
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
