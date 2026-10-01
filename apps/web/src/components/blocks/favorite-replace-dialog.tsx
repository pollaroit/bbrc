"use client";

import type { ListMyFavoritesOutput } from "@bbrc/api/modules/favorite/favorite.schema";
import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import Image from "next/image";
import { useState } from "react";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type FavoriteReplaceDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	favorites: ListMyFavoritesOutput;
	incomingTitle: string;
	onConfirm: (replaceFavoriteId: string) => void;
	loading?: boolean;
};

export function FavoriteReplaceDialog({
	open,
	onOpenChange,
	favorites,
	incomingTitle,
	onConfirm,
	loading = false,
}: FavoriteReplaceDialogProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setSelectedId(null);
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Replace a favorite</DialogTitle>
					<DialogDescription>
						You already have {MAX_FAVORITES_PER_USER} favorites. Pick one to
						swap for {incomingTitle}.
					</DialogDescription>
				</DialogHeader>

				<ul className="flex flex-col gap-2">
					{favorites.map((item) => {
						const selected = selectedId === item.id;
						const coverSrc = bookCoverUrl(item.book.coverId);

						return (
							<li key={item.id}>
								<button
									type="button"
									disabled={loading}
									onClick={() => setSelectedId(item.id)}
									className={cn(
										"flex w-full items-center gap-3 border p-2 text-left transition-colors",
										selected
											? "border-foreground bg-muted/50"
											: "border-border hover:bg-muted/30",
									)}
								>
									<div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{coverSrc ? (
											<Image
												src={coverSrc}
												alt=""
												fill
												className="object-cover"
												sizes="40px"
											/>
										) : null}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-sm">
											{item.book.title}
										</p>
										<p className="truncate text-muted-foreground text-xs">
											{formatBookAuthors(item.book.authors)}
										</p>
									</div>
								</button>
							</li>
						);
					})}
				</ul>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						Cancel
					</Button>
					<LoadingButton
						type="button"
						disabled={!selectedId}
						loading={loading}
						onClick={() => {
							if (selectedId) {
								onConfirm(selectedId);
							}
						}}
					>
						Replace
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
