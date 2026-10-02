"use client";

import { Button } from "@bbrc/ui/components/button";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FeedbackCopyLinkButtonProps = {
	bookSlug: string;
	feedbackSlug: string;
};

export function FeedbackCopyLinkButton({
	bookSlug,
	feedbackSlug,
}: FeedbackCopyLinkButtonProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			const url = `${window.location.origin}/books/${bookSlug}/feedbacks/${feedbackSlug}`;
			await navigator.clipboard.writeText(url);
			toast.success("Review link copied.");
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Could not copy link.");
		}
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-8 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
			aria-label="Copy link to this review"
			onClick={() => void handleCopy()}
		>
			<Link2 className="size-3.5 shrink-0" aria-hidden />
			{copied ? "Copied" : "Copy link"}
		</Button>
	);
}
