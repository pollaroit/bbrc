"use client";

import { cn } from "cn";
import { Loader2Icon } from "lucide-react";
import { useUiLabels } from "./ui-labels";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<Loader2Icon
			data-slot="spinner"
			role="status"
			aria-label={useUiLabels().loading}
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
