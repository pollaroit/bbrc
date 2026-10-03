"use client";

import { Button } from "@bbrc/ui/components/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImagePreviewSize = "default" | "compact" | "avatar" | "cover";

type FullWidthImagePreviewProps = {
	src: string;
	alt: string;
	onRemove?: () => void;
	onReplace?: () => void;
	disabled?: boolean;
	size?: ImagePreviewSize;
	className?: string;
	/** Bleed to parent edges (e.g. dialog body padding). */
	bleed?: boolean;
	/** @deprecated Use `size="compact"` */
	compact?: boolean;
};

function imageMaxHeightClass(size: ImagePreviewSize) {
	switch (size) {
		case "avatar":
			return "max-h-28 max-w-28";
		case "cover":
			return "max-h-48";
		case "compact":
			return "max-h-64";
		default:
			return "max-h-[min(70vh,560px)]";
	}
}

export function FullWidthImagePreview({
	src,
	alt,
	onRemove,
	onReplace,
	disabled,
	size: sizeProp,
	className,
	bleed,
	compact,
}: FullWidthImagePreviewProps) {
	const size = sizeProp ?? (compact ? "compact" : "default");

	return (
		<div
			className={cn(
				"flex w-full min-w-0 max-w-full flex-col border border-border bg-muted/25",
				size === "avatar" && "w-fit max-w-[9rem]",
				bleed ? "-mx-6 w-[calc(100%+3rem)]" : "overflow-hidden",
				className,
			)}
		>
			<div className="flex w-full min-w-0 justify-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={alt}
					className={cn(
						"block h-auto object-contain object-center",
						size === "avatar"
							? "mx-auto w-auto max-w-full"
							: "w-full max-w-full",
						imageMaxHeightClass(size),
					)}
				/>
			</div>
			{onRemove || onReplace ? (
				<div className="flex w-full items-center justify-end gap-1 border-border border-t px-2 py-1.5">
					{onReplace ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8"
							disabled={disabled}
							onClick={onReplace}
						>
							Replace
						</Button>
					) : null}
					{onRemove ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive"
							disabled={disabled}
							aria-label="Remove image"
							onClick={onRemove}
						>
							<X className="size-4" aria-hidden />
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
