import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn("animate-pulse bg-muted", className, "rounded-none")}
			{...props}
		/>
	);
}

export { Skeleton };
