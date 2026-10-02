"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	FacebookIcon,
	TelegramIcon,
	WhatsAppIcon,
	XTwitterIcon,
} from "@/components/blocks/share-brand-icons";
import {
	absoluteShareUrl,
	buildFacebookShareUrl,
	buildTelegramShareUrl,
	buildTwitterShareUrl,
	buildWhatsAppShareUrl,
	openShareWindow,
} from "@/lib/share-urls";
import { cn } from "@/lib/utils";

type ResourceShareMenuProps = {
	/** Site-relative path, e.g. `/posts/my-slug`. */
	path: string;
	/** Optional snippet for social share dialogs. */
	shareText?: string;
	/** Accessible name for the trigger, e.g. "Share post". */
	label: string;
	className?: string;
	triggerClassName?: string;
	size?: "sm" | "md";
};

export function ResourceShareMenu({
	path,
	shareText,
	label,
	className,
	triggerClassName,
	size = "sm",
}: ResourceShareMenuProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopyLink() {
		try {
			const url = absoluteShareUrl(path);
			await navigator.clipboard.writeText(url);
			toast.success("Link copied.");
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Could not copy link.");
		}
	}

	function shareVia(buildUrl: (url: string, text?: string) => string) {
		const url = absoluteShareUrl(path);
		openShareWindow(buildUrl(url, shareText));
	}

	const triggerSize = size === "sm" ? "sm" : "default";
	const iconSize = size === "sm" ? "size-3.5" : "size-4";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={className}
				render={
					<Button
						type="button"
						variant="ghost"
						size={triggerSize}
						className={cn(
							"gap-1.5 text-muted-foreground hover:text-foreground",
							size === "sm" && "h-7 px-2 text-xs",
							size === "md" && "h-8 px-2 text-sm",
							triggerClassName,
						)}
						aria-label={label}
					/>
				}
			>
				<Share2 className={cn(iconSize, "shrink-0")} aria-hidden />
				Share
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuItem onClick={() => void handleCopyLink()}>
					<Link2 aria-hidden />
					{copied ? "Copied" : "Copy link"}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => shareVia(buildWhatsAppShareUrl)}>
					<WhatsAppIcon />
					WhatsApp
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => shareVia(buildTwitterShareUrl)}>
					<XTwitterIcon />
					Twitter
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => shareVia(buildFacebookShareUrl)}>
					<FacebookIcon />
					Facebook
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => shareVia(buildTelegramShareUrl)}>
					<TelegramIcon />
					Telegram
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function commentSharePath(input: {
	postSlug?: string;
	bookSlug?: string;
	feedbackContextSlug?: string;
	commentSlug: string;
}): string | null {
	if (input.postSlug) {
		return `/posts/${input.postSlug}/comments/${input.commentSlug}`;
	}
	if (input.bookSlug && input.feedbackContextSlug) {
		return `/books/${input.bookSlug}/feedbacks/${input.feedbackContextSlug}/comments/${input.commentSlug}`;
	}
	return null;
}
