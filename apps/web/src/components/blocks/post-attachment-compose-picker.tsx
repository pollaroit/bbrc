"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState } from "react";
import {
	ClubBookPicker,
	type ClubBookPickerValue,
} from "@/components/blocks/club-book-picker";
import { PostAttachmentComposePreview } from "@/components/blocks/post-attachment-compose-preview";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type PostAttachmentComposeValue = PostAttachmentInput | null;

type PickerKind = "book" | "shelf" | "user";

const KIND_LABELS: Record<PickerKind, string> = {
	book: "Book",
	shelf: "Shelf",
	user: "Member",
};

type PostAttachmentComposePickerProps = {
	value: PostAttachmentComposeValue;
	onChange: (value: PostAttachmentComposeValue) => void;
	disabled?: boolean;
	className?: string;
};

function ShelfAttachmentSearch({
	onPick,
	disabled,
}: {
	onPick: (input: Extract<PostAttachmentInput, { kind: "shelf" }>) => void;
	disabled?: boolean;
}) {
	const [searchInput, setSearchInput] = useState("");
	const debounced = useDebouncedValue(searchInput, 300);
	const trimmed = debounced.trim();

	const query = useQuery({
		...orpc.shelf.getList.queryOptions({
			input: {
				limit: 8,
				sortBy: "updatedAt",
				sortDirection: "desc",
				...(trimmed.length > 0 ? { search: trimmed } : {}),
			},
		}),
		enabled: trimmed.length > 0,
	});

	const items = query.data?.items ?? [];

	return (
		<div className="flex flex-col gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Search shelves by title or owner…"
					className="ps-8"
					autoComplete="off"
					disabled={disabled}
				/>
			</div>
			{query.isLoading && trimmed.length > 0 ? (
				<Skeleton className="h-10 w-full" />
			) : null}
			{trimmed.length > 0 && !query.isLoading && items.length === 0 ? (
				<p className="text-center text-muted-foreground text-xs">
					No shelves found.
				</p>
			) : null}
			<ul className="flex max-h-48 flex-col gap-1 overflow-y-auto border bg-background p-1">
				{items.map((shelf) => (
					<li key={shelf.id}>
						<Button
							type="button"
							variant="ghost"
							className="h-auto w-full justify-start px-2 py-2 text-left"
							onClick={() =>
								onPick({
									kind: "shelf",
									ownerUsername: shelf.owner.username,
									slug: shelf.slug,
								})
							}
						>
							<span className="line-clamp-1 font-medium text-sm">
								{shelf.title}
							</span>
							<span className="ms-2 shrink-0 text-muted-foreground text-xs">
								@{shelf.owner.username}
							</span>
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

function UserAttachmentSearch({
	onPick,
	disabled,
}: {
	onPick: (input: Extract<PostAttachmentInput, { kind: "user" }>) => void;
	disabled?: boolean;
}) {
	const [searchInput, setSearchInput] = useState("");
	const debounced = useDebouncedValue(searchInput, 300);
	const trimmed = debounced.trim();

	const query = useQuery({
		...orpc.user.getUserList.queryOptions({
			input: {
				limit: 8,
				...(trimmed.length > 0 ? { search: trimmed } : {}),
			},
		}),
		enabled: trimmed.length > 0,
	});

	const items = query.data?.items ?? [];

	return (
		<div className="flex flex-col gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Search members…"
					className="ps-8"
					autoComplete="off"
					disabled={disabled}
				/>
			</div>
			{query.isLoading && trimmed.length > 0 ? (
				<Skeleton className="h-10 w-full" />
			) : null}
			{trimmed.length > 0 && !query.isLoading && items.length === 0 ? (
				<p className="text-center text-muted-foreground text-xs">
					No members found.
				</p>
			) : null}
			<ul className="flex max-h-48 flex-col gap-1 overflow-y-auto border bg-background p-1">
				{items.map((user) => (
					<li key={user.username}>
						<Button
							type="button"
							variant="ghost"
							className="h-auto w-full justify-start px-2 py-2 text-left"
							onClick={() => onPick({ kind: "user", username: user.username })}
						>
							<span className="font-medium text-sm">{user.name}</span>
							<span className="ms-2 text-muted-foreground text-xs">
								@{user.username}
							</span>
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

export function PostAttachmentComposePicker({
	value,
	onChange,
	disabled,
	className,
}: PostAttachmentComposePickerProps) {
	const [draftKind, setDraftKind] = useState<PickerKind | "none">(
		value?.kind === "book" || value?.kind === "shelf" || value?.kind === "user"
			? value.kind
			: "none",
	);
	const [bookPicker, setBookPicker] = useState<ClubBookPickerValue>(null);

	function clearAttachment() {
		setBookPicker(null);
		setDraftKind("none");
		onChange(null);
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{value ? (
				<div className="flex flex-col gap-2">
					<PostAttachmentComposePreview input={value} />
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						disabled={disabled}
						onClick={clearAttachment}
					>
						<X className="size-4" aria-hidden />
						Remove attachment
					</Button>
				</div>
			) : (
				<>
					<Select
						value={draftKind === "none" ? "none" : draftKind}
						onValueChange={(next) => {
							const kind = next as PickerKind | "none";
							setDraftKind(kind);
							setBookPicker(null);
							if (kind === "none") {
								onChange(null);
							}
						}}
						disabled={disabled}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Attach something (optional)" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">Nothing attached</SelectItem>
							{(Object.keys(KIND_LABELS) as PickerKind[]).map((kind) => (
								<SelectItem key={kind} value={kind}>
									{KIND_LABELS[kind]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{draftKind === "book" ? (
						<ClubBookPicker
							value={bookPicker}
							onChange={(book) => {
								setBookPicker(book);
								if (book) {
									onChange({ kind: "book", slug: book.slug });
								}
							}}
						/>
					) : null}

					{draftKind === "shelf" ? (
						<ShelfAttachmentSearch
							disabled={disabled}
							onPick={(input) => onChange(input)}
						/>
					) : null}

					{draftKind === "user" ? (
						<UserAttachmentSearch
							disabled={disabled}
							onPick={(input) => onChange(input)}
						/>
					) : null}
				</>
			)}
		</div>
	);
}
