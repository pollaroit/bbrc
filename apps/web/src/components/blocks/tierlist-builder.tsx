"use client";

import {
	TIERLIST_COLORS,
	TIERLIST_MAX_ITEMS,
	TIERLIST_MAX_TIER_NAME,
	TIERLIST_MIN_TIERS,
	type TierlistColor,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	type CollisionDetection,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	rectIntersection,
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
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
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

const ZONE_PREFIX = "zone:";

type TierlistBuilderProps = {
	draft: TierlistDraft;
	onChange: (draft: TierlistDraft) => void;
};

/**
 * While something is being dragged, nothing else may scroll: the dialog or page
 * behind it would otherwise move under the finger and make dropping impossible.
 * Touch scrolling is cancelled, and every scrollable container around the
 * builder is frozen until the drag ends. (The drag library can still scroll
 * them by itself when you drag near an edge.)
 */
function useLockScrollWhileDragging(
	active: boolean,
	root: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		if (!active) return;

		const cancelTouchScroll = (event: TouchEvent) => {
			if (event.cancelable) event.preventDefault();
		};
		document.addEventListener("touchmove", cancelTouchScroll, {
			passive: false,
		});

		const frozen: { element: HTMLElement; overflow: string }[] = [];
		for (
			let node: HTMLElement | null = root.current?.parentElement ?? null;
			node;
			node = node.parentElement
		) {
			const { overflowY } = getComputedStyle(node);
			if (overflowY === "auto" || overflowY === "scroll") {
				frozen.push({ element: node, overflow: node.style.overflow });
				node.style.overflow = "hidden";
			}
		}

		return () => {
			document.removeEventListener("touchmove", cancelTouchScroll);
			for (const { element, overflow } of frozen) {
				element.style.overflow = overflow;
			}
		};
	}, [active, root]);
}

/** The tier an id belongs to: the tier itself, its drop area, or one of its items. */
function findTier(draft: TierlistDraft, id: string | number) {
	const key = String(id);
	const tierId = key.startsWith(ZONE_PREFIX)
		? key.slice(ZONE_PREFIX.length)
		: key;
	return draft.tiers.find(
		(tier) => tier.id === tierId || tier.items.some((item) => item.id === key),
	);
}

/**
 * Dragging a tier only ever lands on other tiers. Dragging an item lands on the
 * item or tier area under the pointer, never on a whole tier, so an item can be
 * dropped between items, at the end of a tier, or into an empty one.
 */
const collisionDetection: CollisionDetection = (args) => {
	const type = args.active.data.current?.type;
	if (type === "tier") {
		return closestCenter({
			...args,
			droppableContainers: args.droppableContainers.filter(
				(container) => container.data.current?.type === "tier",
			),
		});
	}

	const containers = args.droppableContainers.filter(
		(container) => container.data.current?.type !== "tier",
	);
	const within = pointerWithin({ ...args, droppableContainers: containers });
	const hits = within.length
		? within
		: rectIntersection({ ...args, droppableContainers: containers });
	const itemHit = hits.find(
		(hit) =>
			containers.find((container) => container.id === hit.id)?.data.current
				?.type === "item",
	);
	return itemHit ? [itemHit] : hits.slice(0, 1);
};

/**
 * Builds the tierlist. Everything is dragged: grab a tier by its handle to
 * reorder it, and any tile to move it inside its tier or into another one
 * (press and hold on a phone; with a keyboard, focus it, press Space, use the
 * arrow keys and Space again). Whatever you add lives in a tier, so nothing is
 * left unplaced.
 */
export function TierlistBuilder({ draft, onChange }: TierlistBuilderProps) {
	const [addingTo, setAddingTo] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	useLockScrollWhileDragging(activeId != null, rootRef);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 180, tolerance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const activeTier = draft.tiers.find((tier) => tier.id === activeId);
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

	function onDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	/** While an item is dragged over another tier, it moves there at once, so the tiers make room. */
	function onDragOver({ active, over }: DragOverEvent) {
		if (!over || active.data.current?.type !== "item") return;
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

		if (active.data.current?.type === "tier") {
			const from = draft.tiers.findIndex((tier) => tier.id === active.id);
			const to = draft.tiers.findIndex((tier) => tier.id === over.id);
			if (from >= 0 && to >= 0) {
				onChange({ tiers: arrayMove(draft.tiers, from, to) });
			}
			return;
		}

		const tier = findTier(draft, active.id);
		if (!tier || tier.id !== findTier(draft, over.id)?.id) return;
		const from = tier.items.findIndex((item) => item.id === active.id);
		const to = tier.items.findIndex((item) => item.id === over.id);
		if (from < 0 || to < 0) return;
		setTier(tier.id, { items: arrayMove(tier.items, from, to) });
	}

	const total = tierlistDraftItemCount(draft);

	return (
		<div
			ref={rootRef}
			className="flex flex-col gap-2"
			data-slot="tierlist-builder"
		>
			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetection}
				onDragStart={onDragStart}
				onDragOver={onDragOver}
				onDragEnd={onDragEnd}
				onDragCancel={() => setActiveId(null)}
			>
				<SortableContext
					items={draft.tiers.map((tier) => tier.id)}
					strategy={verticalListSortingStrategy}
				>
					{draft.tiers.map((tier) => (
						<BuilderTier
							key={tier.id}
							tier={tier}
							canRemove={draft.tiers.length > TIERLIST_MIN_TIERS}
							onRename={(name) => setTier(tier.id, { name })}
							onRecolor={(color) => setTier(tier.id, { color })}
							onRemove={() => removeTier(tier.id)}
							onAdd={() => setAddingTo(tier.id)}
							onRemoveItem={removeItem}
						/>
					))}
				</SortableContext>

				<DragOverlay dropAnimation={{ duration: 160 }}>
					{activeItem ? (
						<div className="w-14 rotate-3 cursor-grabbing shadow-lg sm:w-16">
							<TierlistTileFace item={draftItemToView(activeItem)} />
						</div>
					) : activeTier ? (
						<div
							className={cn(
								"flex cursor-grabbing items-center gap-2 border p-2 font-semibold text-sm shadow-lg",
								tierColorClasses(activeTier.color).label,
							)}
						>
							<GripVertical className="size-4" aria-hidden />
							{activeTier.name || "Tier"}
							<span className="ms-auto font-normal text-xs opacity-80">
								{activeTier.items.length}{" "}
								{activeTier.items.length === 1 ? "item" : "items"}
							</span>
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
	canRemove: boolean;
	onRename: (name: string) => void;
	onRecolor: (color: TierlistColor) => void;
	onRemove: () => void;
	onAdd: () => void;
	onRemoveItem: (itemId: string) => void;
};

function BuilderTier({
	tier,
	canRemove,
	onRename,
	onRecolor,
	onRemove,
	onAdd,
	onRemoveItem,
}: BuilderTierProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: tier.id, data: { type: "tier" } });
	const { setNodeRef: setZoneRef, isOver } = useDroppable({
		id: `${ZONE_PREFIX}${tier.id}`,
		data: { type: "zone", tierId: tier.id },
	});
	const colors = tierColorClasses(tier.color);

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn(
				"border border-border bg-background",
				isDragging && "opacity-40",
			)}
		>
			<div className={cn("flex items-center gap-1 border-b p-1", colors.label)}>
				<button
					type="button"
					ref={setActivatorNodeRef}
					className="grid size-9 shrink-0 cursor-grab touch-none place-items-center active:cursor-grabbing"
					aria-label={`Reorder tier ${tier.name || ""}`.trim()}
					title="Drag to reorder"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" aria-hidden />
				</button>

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

				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={!canRemove}
					onClick={onRemove}
					aria-label={`Remove tier ${tier.name || ""}`.trim()}
				>
					<Trash2 aria-hidden />
				</Button>
			</div>

			<SortableContext
				items={tier.items.map((item) => item.id)}
				strategy={rectSortingStrategy}
			>
				<ul
					ref={setZoneRef}
					className={cn(
						GRID,
						"min-h-[4.75rem] transition-colors",
						isOver && "bg-muted/50 ring-1 ring-foreground/30 ring-inset",
					)}
				>
					{tier.items.map((item) => (
						<BuilderTile
							key={item.id}
							item={item}
							tierId={tier.id}
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
					{tier.items.length === 0 ? (
						<li className="col-span-full px-1 pb-1 text-muted-foreground text-xs">
							Drag items here from another tier, or add one with +.
						</li>
					) : null}
				</ul>
			</SortableContext>
		</div>
	);
}

function BuilderTile({
	item,
	tierId,
	onRemove,
}: {
	item: TierlistDraftItem;
	tierId: string;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id, data: { type: "item", tierId } });

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn("relative min-w-0", isDragging && "opacity-30")}
		>
			{/* The whole tile is the handle. The remove button sits outside it. */}
			<div
				ref={setActivatorNodeRef}
				className="cursor-grab touch-manipulation outline-offset-2 focus-visible:outline-2 active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<TierlistTileFace item={draftItemToView(item)} />
			</div>
			<button
				type="button"
				onClick={onRemove}
				className="absolute -top-1 -right-1 grid size-5 place-items-center border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-background focus-visible:outline-2"
				aria-label={`Remove ${item.label || "item"}`}
			>
				<X className="size-3" aria-hidden />
			</button>
		</li>
	);
}
