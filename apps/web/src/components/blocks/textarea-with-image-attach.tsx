"use client";

import { Button } from "@bbrc/ui/components/button";
import { ImagePlus } from "lucide-react";
import { AutoGrowTextarea } from "@/components/blocks/auto-grow-textarea";
import { cn } from "@/lib/utils";

type TextareaWithImageAttachProps = React.ComponentProps<
	typeof AutoGrowTextarea
> & {
	onAttachClick: () => void;
	attachDisabled?: boolean;
	hasPhoto?: boolean;
};

export function AttachImageIconButton({
	onClick,
	disabled,
	hasPhoto,
	className,
}: {
	onClick: () => void;
	disabled?: boolean;
	hasPhoto?: boolean;
	className?: string;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn(
				"size-7 shrink-0 text-muted-foreground hover:text-foreground",
				hasPhoto && "bg-muted text-foreground",
				className,
			)}
			disabled={disabled}
			aria-label="Add photo"
			onClick={onClick}
		>
			<ImagePlus className="size-4" aria-hidden />
		</Button>
	);
}

export function TextareaWithImageAttach({
	className,
	onAttachClick,
	attachDisabled,
	hasPhoto,
	ref,
	...textareaProps
}: TextareaWithImageAttachProps & {
	ref?: React.Ref<HTMLTextAreaElement>;
}) {
	return (
		<div
			className={cn(
				"flex w-full min-w-0 items-end border border-input bg-transparent",
				"focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
				"has-[textarea:disabled]:cursor-not-allowed has-[textarea:disabled]:opacity-50",
			)}
		>
			<AutoGrowTextarea
				ref={ref}
				{...textareaProps}
				className={cn(
					"min-h-8 min-w-0 flex-1 border-0 bg-transparent py-1.5 pr-1 pl-2.5",
					"leading-5 shadow-none focus-visible:ring-0",
					className,
				)}
			/>
			<div className="flex h-8 shrink-0 items-center border-input border-l px-1">
				<AttachImageIconButton
					onClick={onAttachClick}
					disabled={attachDisabled}
					hasPhoto={hasPhoto}
				/>
			</div>
		</div>
	);
}
