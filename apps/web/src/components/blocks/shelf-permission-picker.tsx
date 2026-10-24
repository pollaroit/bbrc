"use client";

import {
	normalizeShelfPermissions,
	presetIdFor,
	SHELF_PERMISSION_GROUPS,
	SHELF_PERMISSION_LABELS,
	SHELF_PERMISSION_PRESETS,
	type ShelfPermission,
} from "@bbrc/shared";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { cn } from "@/lib/utils";

type ShelfPermissionPickerProps = {
	value: readonly ShelfPermission[];
	onChange: (next: ShelfPermission[]) => void;
	/** What the person making the change is allowed to hand out. */
	grantable: ReadonlySet<ShelfPermission>;
	idPrefix: string;
	disabled?: boolean;
};

/** Pick a ready-made role, then fine-tune individual permissions. */
export function ShelfPermissionPicker({
	value,
	onChange,
	grantable,
	idPrefix,
	disabled = false,
}: ShelfPermissionPickerProps) {
	const selected = new Set(value);
	const current = presetIdFor(value);

	function toggle(permission: ShelfPermission, checked: boolean) {
		const next = new Set(selected);
		if (checked) {
			next.add(permission);
		} else {
			next.delete(permission);
		}
		onChange(normalizeShelfPermissions([...next]));
	}

	return (
		<div className="flex flex-col gap-4">
			<fieldset className="flex flex-col gap-2" disabled={disabled}>
				<legend className="pb-1 font-medium text-sm">Role</legend>
				<div className="flex flex-wrap gap-2">
					{SHELF_PERMISSION_PRESETS.map((preset) => {
						const allowed = preset.permissions.every((permission) =>
							grantable.has(permission),
						);
						const active = current === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								aria-pressed={active}
								disabled={disabled || !allowed}
								title={
									allowed
										? preset.description
										: "This role includes permissions you do not have yourself."
								}
								onClick={() =>
									onChange(normalizeShelfPermissions(preset.permissions))
								}
								className={cn(
									"border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40",
									active
										? "border-foreground bg-foreground text-background"
										: "border-border hover:bg-muted/50",
								)}
							>
								{preset.label}
							</button>
						);
					})}
					{current === "custom" ? (
						<span className="border border-border border-dashed px-3 py-1.5 text-muted-foreground text-sm">
							Custom
						</span>
					) : null}
				</div>
				<p className="text-muted-foreground text-xs">
					{current === "custom"
						? "You changed individual permissions below."
						: SHELF_PERMISSION_PRESETS.find((preset) => preset.id === current)
								?.description}
				</p>
			</fieldset>

			<div className="grid gap-4 sm:grid-cols-2">
				{SHELF_PERMISSION_GROUPS.map((group) => (
					<fieldset
						key={group.id}
						className={cn(
							"flex min-w-0 flex-col gap-2",
							group.id === "shelf" && "sm:row-span-2",
						)}
						disabled={disabled}
					>
						<legend className="pb-1 font-medium text-sm">{group.label}</legend>
						{group.permissions.map((permission) => {
							const id = `${idPrefix}-${permission}`;
							const locked = !grantable.has(permission);
							return (
								<label
									key={permission}
									htmlFor={id}
									className={cn(
										"flex items-start gap-2 text-sm leading-snug",
										locked && "cursor-not-allowed opacity-50",
									)}
									title={
										locked
											? "You do not have this permission yourself."
											: undefined
									}
								>
									<Checkbox
										id={id}
										className="mt-0.5"
										checked={selected.has(permission)}
										disabled={disabled || locked}
										onCheckedChange={(checked) => toggle(permission, checked)}
									/>
									<span>{SHELF_PERMISSION_LABELS[permission]}</span>
								</label>
							);
						})}
					</fieldset>
				))}
			</div>
		</div>
	);
}
