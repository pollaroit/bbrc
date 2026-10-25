"use client";

/**
 * Editions members added themselves (the second edition source, next to Open
 * Library). Anyone signed in can add one; the member who added it can edit or
 * delete it; admins can verify, merge duplicates and delete.
 */

import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { Badge } from "@bbrc/ui/components/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	BadgeCheck,
	GitMerge,
	Pencil,
	Plus,
	ShieldCheck,
	ShieldOff,
	Star,
	Trash2,
	Users,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AddEditionDialog } from "@/components/blocks/book-editions/add-edition-dialog";
import {
	EditionSelectBox,
	type EditionSelection,
} from "@/components/blocks/book-editions/edition-select";
import { RelativeTime } from "@/components/blocks/relative-time";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import {
	EDITION_FORMAT_LABELS,
	languageLabel,
} from "@/lib/book-edition/edition-meta";
import { editionPath } from "@/lib/edition/format";
import { memberEditionKeyOf } from "@/lib/edition/member-edition";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type ListData = { items: BookEditionItem[]; addsLeftToday: number | null };

type Props = {
	bookSlug: string;
	bookTitle: string;
	/** Ticking editions to compare (shared with the Open Library list). */
	selection?: EditionSelection;
};

const gridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function CoverFrame({
	href,
	children,
}: {
	href: Route | null;
	children: React.ReactNode;
}) {
	const className = cn(
		"relative mx-auto block aspect-2/3 w-full max-w-[9rem]",
		bookCoverFrameClassName,
	);
	return href ? (
		<Link href={href} className={className} aria-label="Open the edition page">
			{children}
		</Link>
	) : (
		<div className={className}>{children}</div>
	);
}

function Row({
	label,
	value,
}: {
	label: string;
	value: string | null | undefined;
}) {
	if (!value?.trim()) return null;
	return (
		<p className="text-sm">
			<span className="text-muted-foreground">{label}: </span>
			<span>{value}</span>
		</p>
	);
}

export function MemberEditionsSection({
	bookSlug,
	bookTitle,
	selection,
}: Props) {
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;
	const signedIn = Boolean(session?.user);
	const key = orpc.bookEdition.list.queryKey({ input: { bookSlug } });
	const query = useQuery(
		orpc.bookEdition.list.queryOptions({ input: { bookSlug } }),
	);

	const [addOpen, setAddOpen] = useState(false);
	const [editing, setEditing] = useState<BookEditionItem | null>(null);
	const [deleting, setDeleting] = useState<BookEditionItem | null>(null);
	const [merging, setMerging] = useState<BookEditionItem | null>(null);
	const [mergeInto, setMergeInto] = useState<string>("");
	const [highlight, setHighlight] = useState<string | null>(null);

	/** Updates the list now and puts it back if the server says no. */
	const optimistic = async (
		change: (items: BookEditionItem[]) => BookEditionItem[],
	) => {
		await queryClient.cancelQueries({ queryKey: key });
		const previous = queryClient.getQueryData<ListData>(key);
		if (previous) {
			queryClient.setQueryData<ListData>(key, {
				...previous,
				items: change(previous.items),
			});
		}
		return { previous };
	};
	const rollback = (
		context: { previous: ListData | undefined } | undefined,
	) => {
		if (context?.previous) queryClient.setQueryData(key, context.previous);
	};
	const settle = () => void queryClient.invalidateQueries({ queryKey: key });

	const remove = useMutation(
		orpc.bookEdition.delete.mutationOptions({
			onMutate: ({ id }) =>
				optimistic((items) => items.filter((item) => item.id !== id)),
			onError: (error, _input, context) => {
				rollback(context);
				toast.error(error.message);
			},
			onSuccess: () => toast.success("Edition deleted"),
			onSettled: settle,
		}),
	);
	const verify = useMutation(
		orpc.bookEdition.verify.mutationOptions({
			onMutate: ({ id }) =>
				optimistic((items) =>
					items.map((item) =>
						item.id === id
							? { ...item, status: "verified", verifiedAt: new Date() }
							: item,
					),
				),
			onError: (error, _input, context) => {
				rollback(context);
				toast.error(error.message);
			},
			onSettled: settle,
		}),
	);
	const unverify = useMutation(
		orpc.bookEdition.unverify.mutationOptions({
			onMutate: ({ id }) =>
				optimistic((items) =>
					items.map((item) =>
						item.id === id
							? { ...item, status: "member", verifiedAt: null }
							: item,
					),
				),
			onError: (error, _input, context) => {
				rollback(context);
				toast.error(error.message);
			},
			onSettled: settle,
		}),
	);
	const merge = useMutation(
		orpc.bookEdition.merge.mutationOptions({
			onMutate: ({ fromId }) =>
				optimistic((items) => items.filter((item) => item.id !== fromId)),
			onError: (error, _input, context) => {
				rollback(context);
				toast.error(error.message);
			},
			onSuccess: () => {
				toast.success("Editions merged");
				setMerging(null);
			},
			onSettled: settle,
		}),
	);

	const items = query.data?.items ?? [];
	const addsLeft = query.data?.addsLeftToday ?? null;
	// The most read member edition, when it clearly leads (best effort: this list only
	// knows member editions; the edition page compares them all).
	const topReaders = Math.max(0, ...items.map((item) => item.readers));
	const favouriteId =
		topReaders >= 2 &&
		items.filter((item) => item.readers === topReaders).length === 1
			? (items.find((item) => item.readers === topReaders)?.id ?? null)
			: null;

	function focusEdition(id: string) {
		setHighlight(id);
		requestAnimationFrame(() =>
			document
				.getElementById(`edition-${id}`)
				?.scrollIntoView({ block: "center", behavior: "smooth" }),
		);
		window.setTimeout(() => setHighlight(null), 2500);
	}

	return (
		<section
			className="flex flex-col gap-4"
			aria-labelledby="member-editions-title"
		>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<h2
						id="member-editions-title"
						className="font-semibold text-lg tracking-tight"
					>
						Member-added editions
						{items.length > 0 ? (
							<span className="ms-2 font-normal text-muted-foreground text-sm tabular-nums">
								{items.length}
							</span>
						) : null}
					</h2>
					<p className="max-w-prose text-muted-foreground text-sm">
						Editions members added because their copy is not on Open Library.
						Pick one when you start reading, and it counts the right pages.
					</p>
				</div>
				{signedIn ? (
					<div className="flex flex-col items-end gap-1">
						<Button
							type="button"
							size="sm"
							onClick={() => setAddOpen(true)}
							disabled={addsLeft === 0 && !isAdmin}
						>
							<Plus data-icon="inline-start" aria-hidden />
							Add an edition
						</Button>
						{addsLeft != null && addsLeft <= 2 && !isAdmin ? (
							<span className="text-muted-foreground text-xs">
								{addsLeft === 0
									? "You have used today's additions."
									: `${addsLeft} left today`}
							</span>
						) : null}
					</div>
				) : (
					<Button
						size="sm"
						variant="outline"
						nativeButton={false}
						render={<Link href={"/sign-in" as Route} />}
					>
						Sign in to add one
					</Button>
				)}
			</div>

			{query.isPending ? (
				<div className={gridClassName} aria-hidden>
					{Array.from({ length: 2 }, (_, index) => (
						<Skeleton key={index} className="h-72 w-full" />
					))}
				</div>
			) : items.length === 0 ? (
				<p className="border border-border border-dashed p-4 text-muted-foreground text-sm">
					Nobody has added an edition yet. If your copy is not below, add it so
					others can find it.
				</p>
			) : (
				<ul className={gridClassName}>
					{items.map((edition) => {
						const memberKey = memberEditionKeyOf(edition);
						const pageHref = memberKey
							? (editionPath(bookSlug, memberKey) as Route)
							: null;
						return (
							<li
								key={edition.id}
								id={`edition-${edition.id}`}
								className={cn(
									"flex h-full flex-col border border-border bg-card transition-colors",
									highlight === edition.id && "border-foreground bg-muted/40",
								)}
							>
								<div className="flex flex-col gap-4 p-4">
									<CoverFrame href={pageHref}>
										{edition.coverUrl ? (
											<Image
												src={edition.coverUrl}
												alt=""
												fill
												className="object-cover"
												sizes="144px"
											/>
										) : (
											<div className="flex size-full items-center justify-center px-2 text-center text-muted-foreground text-xs">
												No cover
											</div>
										)}
									</CoverFrame>
									<div className="flex min-w-0 flex-col gap-2">
										<div className="flex flex-wrap items-center gap-1.5">
											{edition.status === "verified" ? (
												<Badge
													variant="secondary"
													className="gap-1 text-success-ink"
												>
													<BadgeCheck className="size-3" aria-hidden />
													Verified
												</Badge>
											) : (
												<Badge variant="outline">Member-added</Badge>
											)}
											{favouriteId === edition.id ? (
												<Badge
													variant="secondary"
													className="gap-1 bg-warning/10 text-warning-ink"
												>
													<Star className="size-3" aria-hidden />
													Club favourite
												</Badge>
											) : null}
											{edition.readers > 0 ? (
												<span className="inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
													<Users className="size-3" aria-hidden />
													{edition.readers}{" "}
													{edition.readers === 1 ? "reader" : "readers"}
												</span>
											) : null}
										</div>
										<h3 className="font-medium text-sm leading-snug">
											{pageHref ? (
												<Link
													href={pageHref}
													className="underline-offset-4 hover:underline"
												>
													{edition.title ?? bookTitle}
												</Link>
											) : (
												(edition.title ?? bookTitle)
											)}
										</h3>
										<Row
											label="Language"
											value={languageLabel(edition.language)}
										/>
										<Row
											label="Format"
											value={`${EDITION_FORMAT_LABELS[edition.format]} · ${edition.pages} pp.`}
										/>
										<Row
											label="Publisher"
											value={[edition.publisher, edition.publishedYear]
												.filter(Boolean)
												.join(", ")}
										/>
										<Row label="Translator" value={edition.translator} />
										{edition.isbn13 ? (
											<p className="font-mono text-muted-foreground text-xs">
												ISBN-13 {edition.isbn13}
											</p>
										) : null}
										{edition.notes ? (
											<p className="text-muted-foreground text-xs leading-relaxed">
												{edition.notes}
											</p>
										) : null}
										{edition.createdBy ? (
											<p className="text-muted-foreground text-xs">
												Added by{" "}
												<Link
													href={`/users/${edition.createdBy.username}` as Route}
													className="text-foreground underline-offset-4 hover:underline"
												>
													{edition.createdBy.name}
												</Link>{" "}
												<RelativeTime date={edition.createdAt} />
											</p>
										) : null}
									</div>
								</div>

								{pageHref && memberKey ? (
									<div className="mt-auto flex flex-wrap items-center gap-2 border-border border-t p-3">
										<Button
											size="sm"
											nativeButton={false}
											render={<Link href={pageHref} />}
										>
											View edition
										</Button>
										{selection ? (
											<EditionSelectBox
												editionKey={memberKey}
												selection={selection}
												className="ms-auto"
											/>
										) : null}
									</div>
								) : null}
								{edition.canEdit || edition.canDelete || isAdmin ? (
									<div className="mt-auto flex flex-wrap gap-1.5 border-border border-t p-3">
										{edition.canEdit ? (
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setEditing(edition)}
											>
												<Pencil data-icon="inline-start" aria-hidden />
												Edit
											</Button>
										) : null}
										{isAdmin ? (
											<>
												{edition.status === "verified" ? (
													<Button
														type="button"
														size="sm"
														variant="ghost"
														onClick={() => unverify.mutate({ id: edition.id })}
													>
														<ShieldOff data-icon="inline-start" aria-hidden />
														Unverify
													</Button>
												) : (
													<Button
														type="button"
														size="sm"
														variant="ghost"
														onClick={() => verify.mutate({ id: edition.id })}
													>
														<ShieldCheck data-icon="inline-start" aria-hidden />
														Verify
													</Button>
												)}
												{items.length > 1 ? (
													<Button
														type="button"
														size="sm"
														variant="ghost"
														onClick={() => {
															setMergeInto("");
															setMerging(edition);
														}}
													>
														<GitMerge data-icon="inline-start" aria-hidden />
														Merge
													</Button>
												) : null}
											</>
										) : null}
										{edition.canDelete ? (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												className="ms-auto text-destructive"
												onClick={() => setDeleting(edition)}
											>
												<Trash2 data-icon="inline-start" aria-hidden />
												Delete
											</Button>
										) : null}
									</div>
								) : null}
							</li>
						);
					})}
				</ul>
			)}

			<AddEditionDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={addOpen}
				onOpenChange={setAddOpen}
				onCreated={(edition) => focusEdition(edition.id)}
				onDuplicate={focusEdition}
			/>
			<AddEditionDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={editing != null}
				onOpenChange={(next) => {
					if (!next) setEditing(null);
				}}
				edition={editing}
			/>

			<DestructiveConfirmDialog
				open={deleting != null}
				onOpenChange={(next) => {
					if (!next) setDeleting(null);
				}}
				title="Delete this edition?"
				description={
					deleting && deleting.readers > 0
						? `${deleting.readers} ${deleting.readers === 1 ? "member uses" : "members use"} this edition. They keep their reading, but lose the edition link. Consider merging it into another edition instead.`
						: "It will disappear from the list and from the people who picked it."
				}
				confirmLabel="Delete edition"
				onConfirm={() => {
					if (deleting) remove.mutate({ id: deleting.id });
					setDeleting(null);
				}}
			/>

			<Dialog
				open={merging != null}
				onOpenChange={(next) => {
					if (!next) setMerging(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Merge this edition</DialogTitle>
						<DialogDescription>
							Everyone reading or having read this edition moves to the one you
							pick, and this one is deleted. Missing details (cover, ISBN,
							publisher) are copied over.
						</DialogDescription>
					</DialogHeader>
					<Select
						value={mergeInto}
						onValueChange={(value) => setMergeInto(String(value))}
					>
						<SelectTrigger aria-label="Edition to keep">
							<SelectValue placeholder="Choose the edition to keep" />
						</SelectTrigger>
						<SelectContent>
							{items
								.filter((item) => item.id !== merging?.id)
								.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{[
											item.title ?? bookTitle,
											item.publisher,
											item.publishedYear,
											languageLabel(item.language),
										]
											.filter(Boolean)
											.join(" · ")}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setMerging(null)}>
							Cancel
						</Button>
						<Button
							disabled={!mergeInto || merge.isPending}
							onClick={() =>
								merging &&
								merge.mutate({ fromId: merging.id, intoId: mergeInto })
							}
						>
							Merge editions
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
