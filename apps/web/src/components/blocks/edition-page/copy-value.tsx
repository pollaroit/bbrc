"use client";

import { Button } from "@bbrc/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** A small "copy" button next to a value such as an ISBN. */
export function CopyValueButton({
	value,
	label,
}: {
	value: string;
	/** What is being copied, for the tooltip and the toast ("ISBN-13"). */
	label: string;
}) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			toast.success(`${label} copied`);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			toast.error(`Could not copy the ${label}`);
		}
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			aria-label={`Copy ${label}`}
			title={`Copy ${label}`}
			onClick={() => void copy()}
		>
			{copied ? (
				<Check className="text-success-ink" aria-hidden />
			) : (
				<Copy aria-hidden />
			)}
		</Button>
	);
}
