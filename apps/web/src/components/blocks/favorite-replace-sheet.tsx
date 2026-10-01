"use client";

import type { ListMyFavoritesOutput } from "@bbrc/api/modules/favorite/favorite.schema";
import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import Image from "next/image";
import { useState } from "react";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type FavoriteReplaceSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	favorites: ListMyFavoritesOutput;
	incomingTitle: string;
	onConfirm: (replaceFavoriteId: string) => void;
	loading?: boolean;
};

export function FavoriteReplaceSheet({
	open,
	onOpenChange,
	favorites,
	incomingTitle,
	onConfirm,
	loading = false,
}: FavoriteReplaceSheetProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setSelectedId(null);
				}
				onOpenChange(next);
			}}
		>
			<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Replace a favorite</SheetTitle>
					<SheetDescription>
						You already have {MAX_FAVORITES_PER_USER} favorites. Pick one to
						swap for {incomingTitle}.
					</SheetDescription>
				</SheetHeader>

				<ul className="flex flex-col gap-2 py-2">
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
										"flex w-full min-w-0 items-center gap-3 border p-3 text-left transition-colors",
										selected
											? "border-foreground bg-muted/50"
											: "border-border hover:bg-muted/30",
									)}
								>
									<div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{coverSrc ? (
											<Image
												src={coverSrc}
												alt=""
												fill
												className="object-cover"
												sizes="48px"
											/>
										) : null}
									</div>
									<div className="min-w-0 flex-1">
										<p className="line-clamp-2 font-medium text-sm">
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

				<SheetFooter className="flex-row justify-end gap-2">
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
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
