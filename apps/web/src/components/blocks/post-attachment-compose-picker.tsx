"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Library, Search, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { PostAttachmentComposePreview } from "@/components/blocks/post-attachment-compose-preview";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type PostAttachmentComposeValue = PostAttachmentInput | null;

type PickerKind = "book" | "shelf" | "user";

const KINDS: { id: PickerKind; label: string; icon: typeof BookOpen }[] = [
	{ id: "book", label: "Book", icon: BookOpen },
	{ id: "shelf", label: "Shelf", icon: Library },
	{ id: "user", label: "Member", icon: UserRound },
];

const PLACEHOLDERS: Record<PickerKind, string> = {
	book: "Search the library by title or author…",
	shelf: "Search shelves by title or owner…",
	user: "Search members by name or username…",
};

type PostAttachmentComposePickerProps = {
	value: PostAttachmentComposeValue;
	onChange: (value: PostAttachmentComposeValue) => void;
	disabled?: boolean;
	className?: string;
};

function ResultRow({
	onClick,
	disabled,
	children,
}: {
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<li>
			<button
				type="button"
				disabled={disabled}
				onClick={onClick}
				className="flex w-full items-center gap-3 p-2.5 text-start transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:opacity-50"
			>
				{children}
			</button>
		</li>
	);
}

function BookResults({
	query,
	onPick,
	disabled,
}: {
	query: string;
	onPick: (input: PostAttachmentInput) => void;
	disabled?: boolean;
}) {
	const books = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 8,
				sortBy: "title",
				sortDirection: "asc",
				search: query,
			},
		}),
		enabled: query.length > 0,
	});
	return (
		<Results
			pending={books.isPending}
			empty={(books.data?.items.length ?? 0) === 0}
			emptyText="No books found."
		>
			{books.data?.items.map((book) => {
				const cover = bookCoverUrl(book.coverId, "S");
				return (
					<ResultRow
						key={book.slug}
						disabled={disabled}
						onClick={() => onPick({ kind: "book", slug: book.slug })}
					>
						<span className="relative block aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
							{cover ? (
								<Image
									src={cover}
									alt=""
									fill
									className="object-cover"
									sizes="32px"
								/>
							) : null}
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="truncate font-medium text-sm">{book.title}</span>
							<span className="truncate text-muted-foreground text-xs">
								{formatBookAuthors(book.authors)}
							</span>
						</span>
					</ResultRow>
				);
			})}
		</Results>
	);
}

function ShelfResults({
	query,
	onPick,
	disabled,
}: {
	query: string;
	onPick: (input: PostAttachmentInput) => void;
	disabled?: boolean;
}) {
	const shelves = useQuery({
		...orpc.shelf.getList.queryOptions({
			input: {
				limit: 8,
				sortBy: "updatedAt",
				sortDirection: "desc",
				search: query,
			},
		}),
		enabled: query.length > 0,
	});
	return (
		<Results
			pending={shelves.isPending}
			empty={(shelves.data?.items.length ?? 0) === 0}
			emptyText="No shelves found."
		>
			{shelves.data?.items.map((shelf) => (
				<ResultRow
					key={shelf.id}
					disabled={disabled}
					onClick={() =>
						onPick({
							kind: "shelf",
							ownerUsername: shelf.owner.username,
							slug: shelf.slug,
						})
					}
				>
					<ShelfCover
						coverIds={shelf.coverPreviewCoverIds}
						coverImageUrl={shelf.coverImageUrl}
						size="sm"
						className="size-11"
					/>
					<span className="flex min-w-0 flex-col">
						<span className="truncate font-medium text-sm">{shelf.title}</span>
						<span className="truncate text-muted-foreground text-xs">
							by {shelf.owner.name} · {shelf.bookCount}{" "}
							{shelf.bookCount === 1 ? "book" : "books"}
						</span>
					</span>
				</ResultRow>
			))}
		</Results>
	);
}

function MemberResults({
	query,
	onPick,
	disabled,
}: {
	query: string;
	onPick: (input: PostAttachmentInput) => void;
	disabled?: boolean;
}) {
	const members = useQuery({
		...orpc.user.getUserList.queryOptions({
			input: { limit: 8, search: query },
		}),
		enabled: query.length > 0,
	});
	return (
		<Results
			pending={members.isPending}
			empty={(members.data?.items.length ?? 0) === 0}
			emptyText="No members found."
		>
			{members.data?.items.map((member) => (
				<ResultRow
					key={member.username}
					disabled={disabled}
					onClick={() => onPick({ kind: "user", username: member.username })}
				>
					<UserAvatar
						user={{ name: member.name, image: member.image ?? null }}
						className="size-9"
					/>
					<span className="flex min-w-0 flex-col">
						<span className="truncate font-medium text-sm">{member.name}</span>
						<span className="truncate text-muted-foreground text-xs">
							@{member.username}
						</span>
					</span>
				</ResultRow>
			))}
		</Results>
	);
}

function Results({
	pending,
	empty,
	emptyText,
	children,
}: {
	pending: boolean;
	empty: boolean;
	emptyText: string;
	children: React.ReactNode;
}) {
	if (pending) {
		return <Skeleton className="h-16 w-full" aria-hidden />;
	}
	if (empty) {
		return <p className="text-muted-foreground text-sm">{emptyText}</p>;
	}
	return (
		<ul className="max-h-64 divide-y divide-border overflow-y-auto border border-border bg-background">
			{children}
		</ul>
	);
}

/** Pick one book, shelf or member to attach: choose the kind, search, tap a result. */
export function PostAttachmentComposePicker({
	value,
	onChange,
	disabled,
	className,
}: PostAttachmentComposePickerProps) {
	const [kind, setKind] = useState<PickerKind>(
		value?.kind === "book" || value?.kind === "shelf" || value?.kind === "user"
			? value.kind
			: "book",
	);
	const [search, setSearch] = useState("");
	const query = useDebouncedValue(search.trim(), 250);

	if (value) {
		return (
			<div className={cn("flex min-w-0 flex-col gap-2", className)}>
				<PostAttachmentComposePreview input={value} />
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={disabled}
					onClick={() => {
						setSearch("");
						onChange(null);
					}}
				>
					<X data-icon="inline-start" aria-hidden />
					Remove attachment
				</Button>
			</div>
		);
	}

	const pick = (input: PostAttachmentInput) => {
		setSearch("");
		onChange(input);
	};

	return (
		<div
			className={cn(
				"flex min-w-0 flex-col gap-3 border border-border p-3",
				className,
			)}
		>
			<fieldset className="flex flex-wrap gap-2">
				<legend className="sr-only">What to attach</legend>
				{KINDS.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type="button"
						aria-pressed={kind === id}
						disabled={disabled}
						onClick={() => {
							setKind(id);
							setSearch("");
						}}
						className={cn(
							"inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
							kind === id
								? "border-foreground bg-muted/50"
								: "border-border text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="size-4" aria-hidden />
						{label}
					</button>
				))}
			</fieldset>

			<div className="relative">
				<Search
					className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={PLACEHOLDERS[kind]}
					aria-label={PLACEHOLDERS[kind]}
					className="ps-9"
					autoComplete="off"
					disabled={disabled}
				/>
			</div>

			{query.length === 0 ? null : kind === "book" ? (
				<BookResults query={query} onPick={pick} disabled={disabled} />
			) : kind === "shelf" ? (
				<ShelfResults query={query} onPick={pick} disabled={disabled} />
			) : (
				<MemberResults query={query} onPick={pick} disabled={disabled} />
			)}
		</div>
	);
}
