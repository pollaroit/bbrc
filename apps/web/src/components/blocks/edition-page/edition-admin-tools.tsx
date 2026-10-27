"use client";

import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import type {
	EditionCore,
	EditionPage,
} from "@bbrc/api/modules/edition/edition.schema";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	GitMerge,
	Link2,
	Link2Off,
	Pencil,
	ShieldCheck,
	ShieldOff,
	Trash2,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { editionPath } from "@/lib/edition/format";
import { findMemberEdition } from "@/lib/edition/member-edition";
import { client, orpc, queryClient } from "@/utils/orpc";

const AddEditionDialog = dynamic(
	() =>
		import("@/components/blocks/book-editions/add-edition-dialog").then(
			(mod) => mod.AddEditionDialog,
		),
	{ ssr: false },
);

const OL_EDITION = /^OL\d+M$/i;

function refresh() {
	void queryClient.invalidateQueries({ queryKey: orpc.edition.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.bookEdition.key() });
}

/**
 * Tools for a member edition: the person who added it can edit or delete it;
 * admins can also verify, merge duplicates and link it to an Open Library
 * edition. Open Library editions have none (that data is not ours to change).
 */
export function EditionAdminTools({
	book,
	edition,
}: {
	book: EditionPage["book"];
	edition: EditionCore;
}) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const list = useQuery({
		...orpc.bookEdition.list.queryOptions({ input: { bookSlug: book.slug } }),
		enabled: signedIn && edition.source === "member",
	});

	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [mergeOpen, setMergeOpen] = useState(false);
	const [mergeInto, setMergeInto] = useState("");
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkValue, setLinkValue] = useState("");

	const items = list.data?.items ?? [];
	const member = findMemberEdition(items, edition);
	const isAdmin = session?.user.isAdmin === true;

	const remove = useMutation(
		orpc.bookEdition.delete.mutationOptions({
			onSuccess: () => {
				toast.success("Edition deleted");
				refresh();
				router.push(`/books/${book.slug}/editions` as Route);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const verify = useMutation(
		orpc.bookEdition.verify.mutationOptions({
			onSuccess: () => {
				toast.success("Edition verified");
				refresh();
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const unverify = useMutation(
		orpc.bookEdition.unverify.mutationOptions({
			onSuccess: () => {
				toast.success("Edition is no longer verified");
				refresh();
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const merge = useMutation(
		orpc.bookEdition.merge.mutationOptions({
			onSuccess: () => {
				toast.success("Editions merged");
				setMergeOpen(false);
				refresh();
				// The old address now redirects to the one that was kept.
				router.replace(editionPath(book.slug, edition.key) as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	// `bookEdition.link` is added next to the others; call it through the client so
	// this page compiles whichever order the two changes land in.
	const link = useMutation({
		mutationFn: (input: { id: string; openLibraryOlid: string | null }) =>
			(
				client.bookEdition as unknown as {
					link: (value: typeof input) => Promise<unknown>;
				}
			).link(input),
		onSuccess: (_result, input) => {
			toast.success(
				input.openLibraryOlid
					? "Linked to the Open Library edition"
					: "Link removed",
			);
			setLinkOpen(false);
			refresh();
			router.replace(editionPath(book.slug, edition.key) as Route);
			router.refresh();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	if (edition.source !== "member" || !signedIn) return null;
	if (list.isPending || !member) return null;
	const canEdit = member.canEdit;
	const canDelete = member.canDelete;
	if (!canEdit && !canDelete && !isAdmin) return null;

	const others: BookEditionItem[] = items.filter(
		(item) => item.id !== member.id,
	);
	const linked = edition.openLibraryOlid != null;
	const linkValid = OL_EDITION.test(linkValue.trim());

	return (
		<EditionSection
			id="edition-tools"
			title="Manage this edition"
			description={
				isAdmin
					? "You can edit, verify, merge or link it."
					: "You added this edition, so you can change it."
			}
		>
			<div className="flex flex-wrap gap-2">
				{canEdit ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setEditOpen(true)}
					>
						<Pencil data-icon="inline-start" aria-hidden />
						Edit
					</Button>
				) : null}
				{isAdmin ? (
					member.status === "verified" ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={unverify.isPending}
							onClick={() => unverify.mutate({ id: member.id })}
						>
							<ShieldOff data-icon="inline-start" aria-hidden />
							Remove verification
						</Button>
					) : (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={verify.isPending}
							onClick={() => verify.mutate({ id: member.id })}
						>
							<ShieldCheck data-icon="inline-start" aria-hidden />
							Verify
						</Button>
					)
				) : null}
				{isAdmin && others.length > 0 ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setMergeOpen(true)}
					>
						<GitMerge data-icon="inline-start" aria-hidden />
						Merge into…
					</Button>
				) : null}
				{isAdmin ? (
					linked ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={link.isPending}
							onClick={() =>
								link.mutate({ id: member.id, openLibraryOlid: null })
							}
						>
							<Link2Off data-icon="inline-start" aria-hidden />
							Unlink from Open Library
						</Button>
					) : (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => setLinkOpen(true)}
						>
							<Link2 data-icon="inline-start" aria-hidden />
							Link to Open Library…
						</Button>
					)
				) : null}
				{canDelete ? (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="text-destructive"
						onClick={() => setDeleteOpen(true)}
					>
						<Trash2 data-icon="inline-start" aria-hidden />
						Delete
					</Button>
				) : null}
			</div>

			{editOpen ? (
				<AddEditionDialog
					bookSlug={book.slug}
					bookTitle={book.title}
					open={editOpen}
					onOpenChange={setEditOpen}
					edition={member}
					onCreated={() => {
						refresh();
						router.refresh();
					}}
				/>
			) : null}

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete this edition?"
				description="Its address will say the edition was removed. Readings that used it keep their notes."
				confirmLabel="Delete edition"
				onConfirm={() => {
					setDeleteOpen(false);
					remove.mutate({ id: member.id });
				}}
			/>

			<Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Merge into another edition</DialogTitle>
						<DialogDescription>
							Readers and reads move to the edition you pick, and this address
							redirects there.
						</DialogDescription>
					</DialogHeader>
					<Select
						value={mergeInto}
						onValueChange={(value) => setMergeInto(value ?? "")}
					>
						<SelectTrigger aria-label="Edition to keep">
							<SelectValue placeholder="Choose the edition to keep" />
						</SelectTrigger>
						<SelectContent>
							{others.map((item) => (
								<SelectItem key={item.id} value={item.id}>
									{[
										item.title,
										item.publisher,
										item.publishedYear,
										`${item.pages} pp.`,
									]
										.filter(Boolean)
										.join(" · ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setMergeOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!mergeInto || merge.isPending}
							onClick={() =>
								merge.mutate({ fromId: member.id, intoId: mergeInto })
							}
						>
							Merge
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={linkOpen} onOpenChange={setLinkOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Link to an Open Library edition</DialogTitle>
						<DialogDescription>
							When this is the same edition as one on Open Library, linking them
							gives both one page, and readers of both are counted together.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-1.5 text-sm">
						<label htmlFor="edition-link-olid">Open Library edition id</label>
						<Input
							id="edition-link-olid"
							value={linkValue}
							onChange={(event) => setLinkValue(event.target.value)}
							placeholder="OL123456M"
							className="font-mono"
							autoComplete="off"
							aria-invalid={linkValue.length > 0 && !linkValid}
						/>
						<span className="text-muted-foreground text-xs">
							It ends in M and is in the edition's Open Library address.
						</span>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setLinkOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!linkValid || link.isPending}
							onClick={() =>
								link.mutate({
									id: member.id,
									openLibraryOlid: linkValue.trim().toUpperCase(),
								})
							}
						>
							Link
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</EditionSection>
	);
}
