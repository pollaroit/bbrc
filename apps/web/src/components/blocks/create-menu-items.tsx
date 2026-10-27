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
	UserPlus,
} from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { useCreateGoal } from "@/components/blocks/create-goal-provider";
import {
	MobileSheetRowBody,
	MobileSheetRowIcon,
	mobileSheetRowClass,
} from "@/components/blocks/mobile-chrome-sheet";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type CreateMenuItemsProps = {
	onNavigate?: () => void;
	variant?: "dropdown" | "sheet";
};

function SheetActionRow({
	icon,
	label,
	description,
	onClick,
}: {
	icon: typeof PenLine;
	label: string;
	description?: string;
	onClick: () => void;
}) {
	return (
		<button type="button" className={mobileSheetRowClass} onClick={onClick}>
			<MobileSheetRowIcon icon={icon} />
			<MobileSheetRowBody label={label} description={description} />
		</button>
	);
}

function SheetLinkRow({
	icon,
	label,
	description,
	href,
	onNavigate,
}: {
	icon: typeof PenLine;
	label: string;
	description?: string;
	href: Route;
	onNavigate?: () => void;
}) {
	return (
		<Link href={href} className={mobileSheetRowClass} onClick={onNavigate}>
			<MobileSheetRowIcon icon={icon} />
			<MobileSheetRowBody label={label} description={description} />
		</Link>
	);
}

export function CreateMenuItems({
	onNavigate,
	variant = "dropdown",
}: CreateMenuItemsProps) {
	const t = useTranslations("shell.create");
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
			<nav className="flex flex-col pb-3">
				<SheetActionRow
					icon={PenLine}
					label={t("items.post.label")}
					description={t("items.post.description")}
					onClick={() => {
						onNavigate?.();
						openCompose();
					}}
				/>
				<SheetLinkRow
					icon={LayoutList}
					label={t("items.shelf.label")}
					description={t("items.shelf.description")}
					href={newShelfHref}
					onNavigate={onNavigate}
				/>
				<SheetActionRow
					icon={Target}
					label={t("items.goal.label")}
					description={t("items.goal.description")}
					onClick={() => {
						onNavigate?.();
						openCreateGoal();
					}}
				/>
				{isAdmin ? (
					<>
						<SheetLinkRow
							icon={BookPlus}
							label={t("items.book.label")}
							description={t("items.book.description")}
							href={"/books/new" as Route}
							onNavigate={onNavigate}
						/>
						<SheetLinkRow
							icon={UserPlus}
							label={t("items.author.label")}
							description={t("items.author.description")}
							href={"/authors/new" as Route}
							onNavigate={onNavigate}
						/>
						<SheetLinkRow
							icon={Layers}
							label={t("items.series.label")}
							description={t("items.series.description")}
							href={"/admin/series/new" as Route}
							onNavigate={onNavigate}
						/>
					</>
				) : (
					<SheetLinkRow
						icon={BookMarked}
						label={t("items.requestBook.label")}
						description={t("items.requestBook.description")}
						href={"/books/request" as Route}
						onNavigate={onNavigate}
					/>
				)}
				{showStartSitting ? (
					<SheetLinkRow
						icon={Sofa}
						label={t("items.sitting.label")}
						description={t("items.sitting.description")}
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
				{t("items.post.label")}
			</DropdownMenuItem>
			<DropdownMenuItem
				render={<Link href={newShelfHref} onClick={onNavigate} />}
				nativeButton={false}
			>
				<LayoutList className="size-4" aria-hidden="true" />
				{t("items.shelf.label")}
			</DropdownMenuItem>
			<DropdownMenuItem
				onClick={() => {
					onNavigate?.();
					openCreateGoal();
				}}
			>
				<Target className="size-4" aria-hidden="true" />
				{t("items.goal.label")}
			</DropdownMenuItem>
			{isAdmin ? (
				<>
					<DropdownMenuItem
						render={<Link href={"/books/new" as Route} onClick={onNavigate} />}
						nativeButton={false}
					>
						<BookPlus className="size-4" aria-hidden="true" />
						{t("items.book.label")}
					</DropdownMenuItem>
					<DropdownMenuItem
						render={
							<Link href={"/authors/new" as Route} onClick={onNavigate} />
						}
						nativeButton={false}
					>
						<UserPlus className="size-4" aria-hidden="true" />
						{t("items.author.label")}
					</DropdownMenuItem>
					<DropdownMenuItem
						render={
							<Link href={"/admin/series/new" as Route} onClick={onNavigate} />
						}
						nativeButton={false}
					>
						<Layers className="size-4" aria-hidden="true" />
						{t("items.series.label")}
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
					{t("items.requestBook.label")}
				</DropdownMenuItem>
			)}
			{showStartSitting ? (
				<DropdownMenuItem
					render={<Link href={"/sittings/new" as Route} onClick={onNavigate} />}
					nativeButton={false}
				>
					<Sofa className="size-4" aria-hidden="true" />
					{t("items.sitting.label")}
				</DropdownMenuItem>
			) : null}
		</>
	);
}
