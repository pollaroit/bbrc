"use client";

import { Textarea } from "@bbrc/ui/components/textarea";
import { cn } from "@/lib/utils";

type AutoGrowTextareaProps = React.ComponentProps<typeof Textarea>;

export function AutoGrowTextarea({
	className,
	rows = 1,
	...props
}: AutoGrowTextareaProps) {
	return (
		<Textarea
			rows={rows}
			className={cn("min-h-9 resize-none py-2 leading-normal", className)}
			{...props}
		/>
	);
}
