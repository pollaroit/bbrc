import {
	SHELF_PERMISSION_GROUPS,
	SHELF_PERMISSIONS,
	type ShelfPermission,
} from "@bbrc/shared";
import { cn } from "@/lib/utils";

/**
 * One tick per permission, grouped as books, shelf and people. Filled ticks are
 * what the person can do, so you can compare two collaborators at a glance.
 */
export function ShelfPermissionMeter({
	permissions,
	className,
}: {
	permissions: readonly ShelfPermission[];
	className?: string;
}) {
	const granted = new Set(permissions);

	return (
		<span
			role="img"
			aria-label={`${granted.size} of ${SHELF_PERMISSIONS.length} permissions`}
			className={cn("flex items-end gap-2", className)}
		>
			{SHELF_PERMISSION_GROUPS.map((group) => (
				<span key={group.id} className="flex gap-px">
					{group.permissions.map((permission) => (
						<span
							key={permission}
							className={cn(
								"h-3 w-1",
								granted.has(permission) ? "bg-foreground" : "bg-border",
							)}
						/>
					))}
				</span>
			))}
		</span>
	);
}
