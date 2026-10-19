"use client";

import { DropdownMenuItem } from "@bbrc/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import {
	BookMarked,
	BookPlus,
	Layers,
	LayoutList,
	PenLine,
	Sofa,
	Target,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { useCreateGoal } from "@/components/blocks/create-goal-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type CreateMenuItemsProps = {
	onNavigate?: () => void;
	variant?: "dropdown" | "sheet";
};

const sheetRowClass =
	"flex w-full items-center gap-3 border-border border-b px-4 py-3.5 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

function SheetActionRow({
	icon: Icon,
	label,
	onClick,
}: {
	icon: typeof PenLine;
	label: string;
	onClick: () => void;
}) {
	return (
		<button type="button" className={sheetRowClass} onClick={onClick}>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			{label}
		</button>
	);
}

function SheetLinkRow({
	icon: Icon,
	label,
	href,
	onNavigate,
}: {
	icon: typeof PenLine;
	label: string;
	href: Route;
	onNavigate?: () => void;
}) {
	return (
		<Link href={href} className={sheetRowClass} onClick={onNavigate}>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			{label}
		</Link>
	);
}

export function CreateMenuItems({
	onNavigate,
	variant = "dropdown",
}: CreateMenuItemsProps) {
	const { data: session } = authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session?.user.isAdmin === true,
	});
	const { openCompose } = useComposePost();
	const { openCreateGoal } = useCreateGoal();

	if (!session?.user) {
		return null;
	}

	const isAdmin = session.user.isAdmin === true;
	const showStartSitting = isAdmin && !isOngoingPending && !ongoing;
	const newShelfHref = `/users/${session.user.username}/shelves/new` as Route;

	if (variant === "sheet") {
		return (
			<nav className={cn("flex flex-col pb-2")}>
				<SheetActionRow
					icon={PenLine}
					label="Create post"
					onClick={() => {
						onNavigate?.();
						openCompose();
					}}
				/>
				<SheetLinkRow
					icon={LayoutList}
					label="Create shelf"
					href={newShelfHref}
					onNavigate={onNavigate}
				/>
				<SheetActionRow
					icon={Target}
					label="Add goal"
					onClick={() => {
						onNavigate?.();
						openCreateGoal();
					}}
				/>
				{isAdmin ? (
					<>
						<SheetLinkRow
							icon={BookPlus}
							label="Add book"
							href={"/books/new" as Route}
							onNavigate={onNavigate}
						/>
						<SheetLinkRow
							icon={Layers}
							label="Add series"
							href={"/admin/series/new" as Route}
							onNavigate={onNavigate}
						/>
					</>
				) : (
					<SheetLinkRow
						icon={BookMarked}
						label="Request book"
						href={"/books/request" as Route}
						onNavigate={onNavigate}
					/>
				)}
				{showStartSitting ? (
					<SheetLinkRow
						icon={Sofa}
						label="Start sitting"
						href={"/sittings/new" as Route}
						onNavigate={onNavigate}
					/>
				) : null}
			</nav>
		);
	}

	return (
		<>
			<DropdownMenuItem
				onClick={() => {
					onNavigate?.();
					openCompose();
				}}
			>
				<PenLine className="size-4" aria-hidden="true" />
				Create post
			</DropdownMenuItem>
			<DropdownMenuItem
				render={<Link href={newShelfHref} onClick={onNavigate} />}
				nativeButton={false}
			>
				<LayoutList className="size-4" aria-hidden="true" />
				Create shelf
			</DropdownMenuItem>
			<DropdownMenuItem
				onClick={() => {
					onNavigate?.();
					openCreateGoal();
				}}
			>
				<Target className="size-4" aria-hidden="true" />
				Add goal
			</DropdownMenuItem>
			{isAdmin ? (
				<>
					<DropdownMenuItem
						render={<Link href={"/books/new" as Route} onClick={onNavigate} />}
						nativeButton={false}
					>
						<BookPlus className="size-4" aria-hidden="true" />
						Add book
					</DropdownMenuItem>
					<DropdownMenuItem
						render={
							<Link href={"/admin/series/new" as Route} onClick={onNavigate} />
						}
						nativeButton={false}
					>
						<Layers className="size-4" aria-hidden="true" />
						Add series
					</DropdownMenuItem>
				</>
			) : (
				<DropdownMenuItem
					render={
						<Link href={"/books/request" as Route} onClick={onNavigate} />
					}
					nativeButton={false}
				>
					<BookMarked className="size-4" aria-hidden="true" />
					Request book
				</DropdownMenuItem>
			)}
			{showStartSitting ? (
				<DropdownMenuItem
					render={<Link href={"/sittings/new" as Route} onClick={onNavigate} />}
					nativeButton={false}
				>
					<Sofa className="size-4" aria-hidden="true" />
					Start sitting
				</DropdownMenuItem>
			) : null}
		</>
	);
}
