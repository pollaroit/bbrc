import { cn } from "@/lib/utils";

type ToolButtonProps = {
	icon: React.ReactNode;
	label: string;
	active?: boolean;
	disabled?: boolean;
	reason?: string;
	onClick: () => void;
	className?: string;
};

/** An icon button in a composer's toolbar. Greyed out with a reason when another one is in use. */
export function ToolButton({
	icon,
	label,
	active,
	disabled,
	reason,
	onClick,
	className,
}: ToolButtonProps) {
	return (
		<button
			type="button"
			aria-pressed={active}
			aria-label={label}
			disabled={disabled}
			title={disabled ? reason : label}
			onClick={onClick}
			className={cn(
				"grid size-9 place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40",
				active
					? "border-foreground bg-foreground text-background"
					: "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
				className,
			)}
		>
			{icon}
		</button>
	);
}
