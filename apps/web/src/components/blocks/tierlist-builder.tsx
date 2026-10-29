"use client";

import {
	TIERLIST_COLORS,
	TIERLIST_MAX_ITEMS,
	TIERLIST_MAX_TIER_NAME,
	TIERLIST_MIN_TIERS,
	type TierlistColor,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TierlistAddItemDialog } from "@/components/blocks/tierlist-add-item-dialog";
import { TierlistTileFace } from "@/components/blocks/tierlist-tile";
import {
	canAddTier,
	draftItemToView,
	newDraftId,
	type TierlistDraft,
	type TierlistDraftItem,
	type TierlistDraftTier,
	tierlistDraftItemCount,
	unusedTierColor,
} from "@/lib/tierlist/draft";
import { TIER_COLOR_CLASSES, tierColorClasses } from "@/lib/tierlist-colors";
import { cn } from "@/lib/utils";

const GRID =
	"grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] content-start gap-1 p-1 sm:grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]";

type TierlistBuilderProps = {
	draft: TierlistDraft;
	onChange: (draft: TierlistDraft) => void;
};

function findTier(draft: TierlistDraft, id: string | number) {
	return draft.tiers.find(
		(tier) => tier.id === id || tier.items.some((item) => item.id === id),
	);
}

/**
 * Builds the tierlist: tiers you name and colour, and things you place in them
 * by dragging (press and hold on a phone) or by tapping a tile and choosing a
 * tier. Anything you add lives in a tier, so nothing is left unplaced.
 */
export function TierlistBuilder({ draft, onChange }: TierlistBuilderProps) {
	const [addingTo, setAddingTo] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 220, tolerance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const activeItem = activeId
		? draft.tiers.flatMap((tier) => tier.items).find((i) => i.id === activeId)
		: undefined;
	const addingTier = addingTo
		? draft.tiers.find((tier) => tier.id === addingTo)
		: undefined;

	function setTier(id: string, patch: Partial<TierlistDraftTier>) {
		onChange({
			tiers: draft.tiers.map((tier) =>
				tier.id === id ? { ...tier, ...patch } : tier,
			),
		});
	}

	function addTier() {
		if (!canAddTier(draft)) return;
		onChange({
			tiers: [
				...draft.tiers,
				{
					id: newDraftId("tier"),
					name: `Tier ${draft.tiers.length + 1}`,
					color: unusedTierColor(draft),
					items: [],
				},
			],
		});
	}

	function removeTier(id: string) {
		if (draft.tiers.length <= TIERLIST_MIN_TIERS) return;
		onChange({ tiers: draft.tiers.filter((tier) => tier.id !== id) });
	}

	function moveTier(id: string, by: -1 | 1) {
		const from = draft.tiers.findIndex((tier) => tier.id === id);
		const to = from + by;
		if (from < 0 || to < 0 || to >= draft.tiers.length) return;
		onChange({ tiers: arrayMove(draft.tiers, from, to) });
	}

	function addItem(tierId: string, item: Omit<TierlistDraftItem, "id">) {
		onChange({
			tiers: draft.tiers.map((tier) =>
				tier.id === tierId
					? {
							...tier,
							items: [...tier.items, { ...item, id: newDraftId("item") }],
						}
					: tier,
			),
		});
	}

	function removeItem(itemId: string) {
		onChange({
			tiers: draft.tiers.map((tier) => ({
				...tier,
				items: tier.items.filter((item) => item.id !== itemId),
			})),
		});
	}

	/** Moves an item to the end of another tier (the tap alternative to dragging). */
	function sendItem(itemId: string, toTierId: string) {
		const item = draft.tiers
			.flatMap((tier) => tier.items)
			.find((entry) => entry.id === itemId);
		if (!item) return;
		onChange({
			tiers: draft.tiers.map((tier) => {
				const without = tier.items.filter((entry) => entry.id !== itemId);
				return tier.id === toTierId
					? { ...tier, items: [...without, item] }
					: { ...tier, items: without };
			}),
		});
	}

	function onDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	function onDragOver({ active, over }: DragOverEvent) {
		if (!over) return;
		const from = findTier(draft, active.id);
		const to = findTier(draft, over.id);
		if (!from || !to || from.id === to.id) return;

		const item = from.items.find((entry) => entry.id === active.id);
		if (!item) return;
		const overIndex = to.items.findIndex((entry) => entry.id === over.id);
		const index = overIndex >= 0 ? overIndex : to.items.length;

		onChange({
			tiers: draft.tiers.map((tier) => {
				if (tier.id === from.id) {
					return {
						...tier,
						items: tier.items.filter((entry) => entry.id !== active.id),
					};
				}
				if (tier.id === to.id) {
					const items = [...tier.items];
					items.splice(index, 0, item);
					return { ...tier, items };
				}
				return tier;
			}),
		});
	}

	function onDragEnd({ active, over }: DragEndEvent) {
		setActiveId(null);
		if (!over || active.id === over.id) return;
		const tier = findTier(draft, active.id);
		if (!tier || tier.id !== findTier(draft, over.id)?.id) return;

		const from = tier.items.findIndex((item) => item.id === active.id);
		const to = tier.items.findIndex((item) => item.id === over.id);
		if (from < 0 || to < 0) return;
		setTier(tier.id, { items: arrayMove(tier.items, from, to) });
	}

	const total = tierlistDraftItemCount(draft);

	return (
		<div className="flex flex-col gap-2" data-slot="tierlist-builder">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={onDragStart}
				onDragOver={onDragOver}
				onDragEnd={onDragEnd}
				onDragCancel={() => setActiveId(null)}
			>
				{draft.tiers.map((tier, index) => (
					<BuilderTier
						key={tier.id}
						tier={tier}
						allTiers={draft.tiers}
						isFirst={index === 0}
						isLast={index === draft.tiers.length - 1}
						canRemove={draft.tiers.length > TIERLIST_MIN_TIERS}
						onRename={(name) => setTier(tier.id, { name })}
						onRecolor={(color) => setTier(tier.id, { color })}
						onMove={(by) => moveTier(tier.id, by)}
						onRemove={() => removeTier(tier.id)}
						onAdd={() => setAddingTo(tier.id)}
						onSendItem={sendItem}
						onRemoveItem={removeItem}
					/>
				))}

				<DragOverlay>
					{activeItem ? (
						<div className="w-14 opacity-90 shadow-lg sm:w-16">
							<TierlistTileFace item={draftItemToView(activeItem)} />
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			<div className="flex items-center justify-between gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!canAddTier(draft)}
					onClick={addTier}
				>
					<Plus aria-hidden />
					Add a tier
				</Button>
				<span className="text-muted-foreground text-xs tabular-nums">
					{total} / {TIERLIST_MAX_ITEMS} items
				</span>
			</div>

			<TierlistAddItemDialog
				open={addingTier != null}
				onOpenChange={(open) => {
					if (!open) setAddingTo(null);
				}}
				tierName={addingTier?.name ?? ""}
				draft={draft}
				onAdd={(item) => {
					if (addingTier) addItem(addingTier.id, item);
				}}
			/>
		</div>
	);
}

type BuilderTierProps = {
	tier: TierlistDraftTier;
	allTiers: TierlistDraftTier[];
	isFirst: boolean;
	isLast: boolean;
	canRemove: boolean;
	onRename: (name: string) => void;
	onRecolor: (color: TierlistColor) => void;
	onMove: (by: -1 | 1) => void;
	onRemove: () => void;
	onAdd: () => void;
	onSendItem: (itemId: string, toTierId: string) => void;
	onRemoveItem: (itemId: string) => void;
};

function BuilderTier({
	tier,
	allTiers,
	isFirst,
	isLast,
	canRemove,
	onRename,
	onRecolor,
	onMove,
	onRemove,
	onAdd,
	onSendItem,
	onRemoveItem,
}: BuilderTierProps) {
	const { setNodeRef, isOver } = useDroppable({ id: tier.id });
	const colors = tierColorClasses(tier.color);

	return (
		<div className="border border-border">
			<div className={cn("flex items-center gap-1 border-b p-1", colors.label)}>
				<Popover>
					<PopoverTrigger
						render={
							<button
								type="button"
								className="grid size-8 shrink-0 place-items-center"
								aria-label={`Colour of ${tier.name || "this tier"}: ${colors.name}`}
							/>
						}
					>
						<span
							className={cn("size-5 ring-1 ring-foreground/20", colors.swatch)}
						/>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-2" align="start">
						<fieldset className="m-0 grid min-w-0 grid-cols-4 gap-1.5 border-0 p-0">
							<legend className="sr-only">Tier colour</legend>
							{TIERLIST_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									aria-pressed={tier.color === color}
									aria-label={TIER_COLOR_CLASSES[color].name}
									title={TIER_COLOR_CLASSES[color].name}
									onClick={() => onRecolor(color)}
									className={cn(
										"grid size-9 place-items-center ring-1 ring-foreground/20 focus-visible:outline-2",
										TIER_COLOR_CLASSES[color].swatch,
									)}
								>
									{tier.color === color ? (
										<Check className="size-4 text-background" aria-hidden />
									) : null}
								</button>
							))}
						</fieldset>
					</PopoverContent>
				</Popover>

				<Input
					value={tier.name}
					onChange={(event) => onRename(event.target.value)}
					maxLength={TIERLIST_MAX_TIER_NAME}
					aria-label="Tier name"
					placeholder="Tier name"
					autoComplete="off"
					className="h-8 min-w-0 flex-1 bg-background/60 font-semibold"
				/>

				<div className="flex shrink-0 items-center">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						disabled={isFirst}
						onClick={() => onMove(-1)}
						aria-label={`Move ${tier.name || "tier"} up`}
					>
						<ArrowUp aria-hidden />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						disabled={isLast}
						onClick={() => onMove(1)}
						aria-label={`Move ${tier.name || "tier"} down`}
					>
						<ArrowDown aria-hidden />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						disabled={!canRemove}
						onClick={onRemove}
						aria-label={`Remove ${tier.name || "tier"}`}
					>
						<Trash2 aria-hidden />
					</Button>
				</div>
			</div>

			<SortableContext
				items={tier.items.map((item) => item.id)}
				strategy={rectSortingStrategy}
			>
				<ul
					ref={setNodeRef}
					className={cn(GRID, "min-h-[4.5rem]", isOver && "bg-muted/40")}
				>
					{tier.items.map((item) => (
						<BuilderTile
							key={item.id}
							item={item}
							tiers={allTiers}
							currentTierId={tier.id}
							onSend={(toTierId) => onSendItem(item.id, toTierId)}
							onRemove={() => onRemoveItem(item.id)}
						/>
					))}
					<li className="min-w-0">
						<button
							type="button"
							onClick={onAdd}
							className="grid aspect-2/3 w-full place-items-center border border-border border-dashed text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2"
							aria-label={`Add to ${tier.name || "this tier"}`}
						>
							<Plus className="size-5" aria-hidden />
						</button>
					</li>
				</ul>
			</SortableContext>
		</div>
	);
}

function BuilderTile({
	item,
	tiers,
	currentTierId,
	onSend,
	onRemove,
}: {
	item: TierlistDraftItem;
	tiers: TierlistDraftTier[];
	currentTierId: string;
	onSend: (toTierId: string) => void;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn("min-w-0 touch-manipulation", isDragging && "opacity-30")}
			{...attributes}
			{...listeners}
		>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							className="block w-full outline-offset-2 focus-visible:outline-2"
							aria-label={`${item.label || "Item"}: move or remove`}
						/>
					}
				>
					<TierlistTileFace item={draftItemToView(item)} />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="min-w-44">
					<DropdownMenuLabel>Move to</DropdownMenuLabel>
					{tiers
						.filter((tier) => tier.id !== currentTierId)
						.map((tier) => (
							<DropdownMenuItem key={tier.id} onClick={() => onSend(tier.id)}>
								<span
									className={cn(
										"size-3 shrink-0",
										tierColorClasses(tier.color).swatch,
									)}
									aria-hidden
								/>
								{tier.name || "Unnamed tier"}
							</DropdownMenuItem>
						))}
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={onRemove}>
						<Trash2 aria-hidden />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
