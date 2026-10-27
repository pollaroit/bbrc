"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type BookAddToShelfDialogProps = {
	bookSlug: string;
	username: string;
	trigger?: "button" | "icon";
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
};

export function BookAddToShelfDialog({
	bookSlug,
	username,
	trigger = "button",
	className,
	tooltipSide = "top",
}: BookAddToShelfDialogProps) {
	const t = useTranslations("books");
	const [open, setOpen] = useState(false);
	/** `owner/slug`: the same slug can exist under several owners. */
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

	const shelvesQuery = useQuery({
		...orpc.shelf.listMineEditable.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	const editableKey = orpc.shelf.listMineEditable.queryKey({
		input: { bookSlug },
	});

	const addMutation = useMutation(
		orpc.shelf.addBook.mutationOptions({
			// Adds to the same shelf run one at a time, in click order.
			scope: { id: `shelf-${selectedKey ?? "none"}` },
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: editableKey });
				const previous = queryClient.getQueryData(editableKey);

				queryClient.setQueryData(editableKey, (old) =>
					old
						? {
								...old,
								items: old.items.map((shelf) =>
									shelf.slug === variables.shelfSlug &&
									shelf.ownerUsername === (variables.ownerUsername ?? username)
										? {
												...shelf,
												containsBook: true,
												bookCount: shelf.bookCount + 1,
											}
										: shelf,
								),
							}
						: old,
				);

				setOpen(false);
				setSelectedKey(null);
				return { previous };
			},
			onError: (error, _variables, context) => {
				if (context) {
					queryClient.setQueryData(editableKey, context.previous);
				}
				toast.error(error.message ?? t("shelfDialog.addFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listMineEditable.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key(),
				});
			},
		}),
	);

	const items = shelvesQuery.data?.items ?? [];
	const max = shelvesQuery.data?.maxBooksPerShelf ?? 50;

	const newShelfHref =
		`/users/${username}/shelves/new?addBookSlug=${encodeURIComponent(bookSlug)}&returnTo=${encodeURIComponent(`/books/${bookSlug}`)}` as Route;

	const openDialog = () => setOpen(true);

	const triggerNode =
		trigger === "icon" ? (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={cn("size-8 shrink-0", className)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								openDialog();
							}}
							aria-label={t("shelfDialog.addToShelf")}
						/>
					}
				>
					<Library className="size-4" aria-hidden />
				</TooltipTrigger>
				<TooltipContent side={tooltipSide}>
					{t("shelfDialog.addToShelf")}
				</TooltipContent>
			</Tooltip>
		) : (
			<Button type="button" variant="outline" size="sm" onClick={openDialog}>
				{t("shelfDialog.addToShelf")}
			</Button>
		);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{triggerNode}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("shelfDialog.addToShelf")}</DialogTitle>
					<DialogDescription>
						{t("shelfDialog.description", { max })}
					</DialogDescription>
				</DialogHeader>

				{shelvesQuery.isPending ? (
					<p className="text-muted-foreground text-sm">
						{t("shelfDialog.loading")}
					</p>
				) : items.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{t("shelfDialog.none")}
					</p>
				) : (
					<ul className="max-h-64 space-y-2 overflow-y-auto py-1">
						{items.map((shelf) => {
							const atCap = shelf.bookCount >= max;
							const onShelf = shelf.containsBook;
							const disabled = atCap || onShelf;
							const key = `${shelf.ownerUsername}/${shelf.slug}`;
							const selected = selectedKey === key;

							return (
								<li key={`${shelf.ownerUsername}/${shelf.slug}`}>
									<button
										type="button"
										disabled={disabled}
										onClick={() => setSelectedKey(key)}
										className={cn(
											"w-full border border-border p-3 text-left transition-colors",
											selected && "border-foreground ring-1 ring-foreground",
											disabled && "cursor-not-allowed opacity-50",
											!disabled && !selected && "hover:bg-muted/40",
										)}
									>
										<p className="font-medium leading-snug">{shelf.title}</p>
										<p className="text-muted-foreground text-xs">
											{shelf.isOwner
												? ""
												: t("shelfDialog.by", {
														username: shelf.ownerUsername,
													})}
											{t("shelfDialog.count", { count: shelf.bookCount, max })}
											{shelf.status === "draft" ? t("shelfDialog.draft") : ""}
											{onShelf ? t("shelfDialog.alreadyOn") : ""}
											{atCap && !onShelf ? t("shelfDialog.full") : ""}
										</p>
									</button>
								</li>
							);
						})}
					</ul>
				)}

				<DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
					<Button
						type="button"
						disabled={!selectedKey}
						onClick={() => {
							const chosen = items.find(
								(shelf) =>
									`${shelf.ownerUsername}/${shelf.slug}` === selectedKey,
							);
							if (!chosen) return;
							addMutation.mutate({
								ownerUsername: chosen.ownerUsername,
								shelfSlug: chosen.slug,
								bookSlug,
							});
						}}
					>
						{t("shelfDialog.addBook")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						render={<Link href={newShelfHref} />}
						nativeButton={false}
						onClick={() => setOpen(false)}
					>
						{t("shelfDialog.createNew")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
