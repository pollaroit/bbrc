"use client";

import {
	normalizeTierlistText,
	TIERLIST_MAX_ITEM_LABEL,
	TIERLIST_MAX_ITEMS,
	tierlistItemDedupeKey,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@bbrc/ui/components/tabs";
import { ImagePlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PollTargetPicker } from "@/components/blocks/poll-target-picker";
import { uploadTierlistImage } from "@/lib/storage/upload-tierlist-image";
import {
	canAddItem,
	type TierlistDraft,
	type TierlistDraftItem,
	tierlistDraftItemCount,
} from "@/lib/tierlist/draft";

const CoverCropper = dynamic(
	() =>
		import("@/components/blocks/cover-cropper").then((mod) => mod.CoverCropper),
	{ ssr: false },
);

type NewItem = Omit<TierlistDraftItem, "id">;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tierName: string;
	draft: TierlistDraft;
	onAdd: (item: NewItem) => void;
};

const blank: NewItem = {
	kind: "text",
	label: "",
	imageUrl: null,
	bookSlug: null,
	authorSlug: null,
	coverId: null,
	photoUrl: null,
};

/** Adds one thing to a tier: some text, a picture, a book or an author. It stays open for adding several. */
export function TierlistAddItemDialog({
	open,
	onOpenChange,
	tierName,
	draft,
	onAdd,
}: Props) {
	const [text, setText] = useState("");
	const [caption, setCaption] = useState("");
	const [cropFile, setCropFile] = useState<File | null>(null);
	const [picture, setPicture] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [added, setAdded] = useState(0);
	const fileInput = useRef<HTMLInputElement>(null);

	const pictureUrl = useMemo(
		() => (picture ? URL.createObjectURL(picture) : null),
		[picture],
	);
	useEffect(
		() => () => {
			if (pictureUrl) URL.revokeObjectURL(pictureUrl);
		},
		[pictureUrl],
	);

	useEffect(() => {
		if (!open) {
			setText("");
			setCaption("");
			setCropFile(null);
			setPicture(null);
			setAdded(0);
		}
	}, [open]);

	const placed = useMemo(() => {
		const books = new Set<string>();
		const authors = new Set<string>();
		const keys = new Set<string>();
		for (const tier of draft.tiers) {
			for (const item of tier.items) {
				if (item.bookSlug) books.add(item.bookSlug);
				if (item.authorSlug) authors.add(item.authorSlug);
				const key = tierlistItemDedupeKey(item);
				if (key) keys.add(key);
			}
		}
		return { books, authors, keys };
	}, [draft]);

	const full = !canAddItem(draft);

	function add(item: NewItem) {
		if (!canAddItem(draft)) {
			toast.error(`A tierlist can have up to ${TIERLIST_MAX_ITEMS} items.`);
			return;
		}
		onAdd(item);
		setAdded((count) => count + 1);
	}

	function addText() {
		const label = normalizeTierlistText(text);
		if (!label) return;
		if (label.length > TIERLIST_MAX_ITEM_LABEL) {
			toast.error(`Up to ${TIERLIST_MAX_ITEM_LABEL} characters.`);
			return;
		}
		if (placed.keys.has(`text:${label.toLowerCase()}`)) {
			toast.error("That is already on your list.");
			return;
		}
		add({ ...blank, kind: "text", label });
		setText("");
	}

	async function addPicture() {
		if (!picture) return;
		setUploading(true);
		try {
			const { publicUrl } = await uploadTierlistImage(picture);
			add({
				...blank,
				kind: "image",
				imageUrl: publicUrl,
				label: normalizeTierlistText(caption),
			});
			setPicture(null);
			setCaption("");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	return (
		<>
			<Dialog open={open && !cropFile} onOpenChange={onOpenChange}>
				<DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-3 sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add to {tierName || "this tier"}</DialogTitle>
						<DialogDescription>
							{tierlistDraftItemCount(draft)} of {TIERLIST_MAX_ITEMS} items.
							{added > 0 ? ` ${added} added just now.` : ""}
						</DialogDescription>
					</DialogHeader>

					{full ? (
						<p className="text-destructive text-sm">
							You have reached the limit of {TIERLIST_MAX_ITEMS} items.
						</p>
					) : (
						<Tabs
							defaultValue="book"
							className="min-h-0 flex-1 overflow-y-auto"
						>
							<TabsList className="w-full">
								<TabsTrigger value="book">Book</TabsTrigger>
								<TabsTrigger value="author">Author</TabsTrigger>
								<TabsTrigger value="text">Text</TabsTrigger>
								<TabsTrigger value="image">Picture</TabsTrigger>
							</TabsList>

							<TabsContent value="book" className="pt-3">
								<PollTargetPicker
									kind="book"
									taken={placed.books}
									autoFocus
									onPick={(pick) =>
										add({
											...blank,
											kind: "book",
											label: pick.label,
											bookSlug: pick.key,
											coverId: pick.coverId,
										})
									}
								/>
							</TabsContent>

							<TabsContent value="author" className="pt-3">
								<PollTargetPicker
									kind="author"
									taken={placed.authors}
									autoFocus
									onPick={(pick) =>
										add({
											...blank,
											kind: "author",
											label: pick.label,
											authorSlug: pick.key,
											photoUrl: pick.image,
										})
									}
								/>
							</TabsContent>

							<TabsContent value="text" className="flex flex-col gap-2 pt-3">
								<form
									className="flex gap-2"
									onSubmit={(event) => {
										event.preventDefault();
										addText();
									}}
								>
									<Input
										value={text}
										onChange={(event) => setText(event.target.value)}
										maxLength={TIERLIST_MAX_ITEM_LABEL}
										placeholder="Anything you want to rank"
										aria-label="Text"
										autoComplete="off"
									/>
									<Button type="submit" disabled={!text.trim()}>
										Add
									</Button>
								</form>
								<p className="text-muted-foreground text-xs">
									Up to {TIERLIST_MAX_ITEM_LABEL} characters.
								</p>
							</TabsContent>

							<TabsContent value="image" className="flex flex-col gap-3 pt-3">
								<input
									ref={fileInput}
									type="file"
									accept="image/jpeg,image/png,image/webp"
									className="sr-only"
									tabIndex={-1}
									onChange={(event) => {
										const file = event.target.files?.[0];
										event.target.value = "";
										if (!file) return;
										if (file.size > 5 * 1024 * 1024) {
											toast.error("Choose an image under 5 MB.");
											return;
										}
										setCropFile(file);
									}}
								/>
								{pictureUrl ? (
									<div className="flex items-start gap-3">
										{/* biome-ignore lint/performance/noImgElement: a local preview of the picked file. */}
										<img
											src={pictureUrl}
											alt="Preview of your upload"
											className="aspect-2/3 w-20 shrink-0 object-cover ring-1 ring-foreground/10"
										/>
										<div className="flex min-w-0 flex-1 flex-col gap-2">
											<Input
												value={caption}
												onChange={(event) => setCaption(event.target.value)}
												maxLength={TIERLIST_MAX_ITEM_LABEL}
												placeholder="Caption (optional)"
												aria-label="Caption"
												autoComplete="off"
											/>
											<div className="flex gap-2">
												<LoadingButton
													type="button"
													loading={uploading}
													onClick={addPicture}
												>
													Add picture
												</LoadingButton>
												<Button
													type="button"
													variant="outline"
													disabled={uploading}
													onClick={() => fileInput.current?.click()}
												>
													Change
												</Button>
											</div>
										</div>
									</div>
								) : (
									<Button
										type="button"
										variant="outline"
										className="h-24 w-full flex-col gap-1"
										onClick={() => fileInput.current?.click()}
									>
										<ImagePlus className="size-5" aria-hidden />
										Choose a picture
									</Button>
								)}
								<p className="text-muted-foreground text-xs">
									Pictures are cropped to a tall frame. The caption is optional.
								</p>
							</TabsContent>
						</Tabs>
					)}

					<DialogFooter>
						<Button type="button" onClick={() => onOpenChange(false)}>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{cropFile ? (
				<CoverCropper
					file={cropFile}
					onCancel={() => setCropFile(null)}
					onDone={(file) => {
						setCropFile(null);
						setPicture(file);
					}}
				/>
			) : null}
		</>
	);
}
