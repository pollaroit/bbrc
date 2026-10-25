"use client";

import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Field } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useId, useState } from "react";
import { toast } from "sonner";
import { MemberProfileShelfCard } from "@/components/blocks/member-profile-shelf-card";
import {
	ShelfEditorSection,
	ShelfEditorShell,
} from "@/components/blocks/shelf-editor-shell";
import {
	ShelfOptionPicker,
	shelfAccessOptions,
	shelfTypeOptions,
	shelfVisibilityCreateOptions,
} from "@/components/blocks/shelf-form-options";
import { orpc, queryClient } from "@/utils/orpc";

type CreateShelfFormProps = {
	username: string;
};

export function CreateShelfForm({ username }: CreateShelfFormProps) {
	const router = useRouter();
	const titleId = useId();
	const descriptionId = useId();
	const [returnTo] = useQueryState("returnTo", parseAsString);
	const [addBookSlug] = useQueryState("addBookSlug", parseAsString);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "active">("draft");
	const [type, setType] = useState<"ordered" | "unordered">("unordered");
	const [access, setAccess] = useState<"public" | "private">("public");

	const createMutation = useMutation(
		orpc.shelf.create.mutationOptions({
			onSuccess: async (result) => {
				toast.success("Shelf created.");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				const fallback = `/users/${username}/shelves/${result.slug}` as Route;
				const target = returnTo?.startsWith("/")
					? (returnTo as Route)
					: fallback;
				router.push(target);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not create shelf.");
			},
		}),
	);

	const cancelHref = (
		returnTo?.startsWith("/") ? returnTo : `/users/${username}/shelves`
	) as Route;

	const trimmedTitle = title.trim();

	return (
		<ShelfEditorShell
			title="New shelf"
			description="Name your list, choose who can see it, and pick how books are shown. Add up to 50 books from the shelf page or any book page."
			backHref={`/users/${username}/shelves` as Route}
			backLabel="Shelves"
			preview={
				<MemberProfileShelfCard
					preview
					showStatus
					shelf={{
						id: "preview",
						slug: "preview",
						title: trimmedTitle || "Untitled shelf",
						description: description.trim() || null,
						coverImageUrl: null,
						status,
						type,
						visibility: access,
						isWishlist: false,
						bookCount: addBookSlug ? 1 : 0,
						updatedAt: new Date(),
						coverPreviewCoverIds: [],
						role: "owner",
						owner: { username, name: username },
						collaboratorCount: 0,
					}}
				/>
			}
			onSubmit={(event) => {
				event.preventDefault();
				if (!trimmedTitle) {
					toast.error("Add a title for your shelf.");
					return;
				}
				createMutation.mutate({
					title: trimmedTitle,
					description: description.trim() || null,
					status,
					type,
					visibility: access,
					addBookSlug: addBookSlug ?? undefined,
				});
			}}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						render={<Link href={cancelHref} />}
						nativeButton={false}
					>
						Cancel
					</Button>
					<LoadingButton
						type="submit"
						loading={createMutation.isPending}
						disabled={!trimmedTitle}
					>
						Create shelf
					</LoadingButton>
				</>
			}
		>
			{addBookSlug ? (
				<p className="border border-border bg-muted/30 px-4 py-3 text-muted-foreground text-sm leading-relaxed">
					The book you picked (
					<span className="font-mono text-foreground">{addBookSlug}</span>) will
					be added to this shelf when you create it.
				</p>
			) : null}

			<ShelfEditorSection title="Basics">
				<Field>
					<div className="flex items-baseline justify-between gap-2">
						<Label htmlFor={titleId}>Title</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{title.length}/120
						</span>
					</div>
					<Input
						id={titleId}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						maxLength={120}
						placeholder="e.g. Books I want to read this year"
						autoComplete="off"
						required
					/>
				</Field>
				<Field>
					<div className="flex items-baseline justify-between gap-2">
						<Label htmlFor={descriptionId}>
							Description{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{description.length}/2000
						</span>
					</div>
					<Textarea
						id={descriptionId}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						maxLength={2000}
						rows={4}
						placeholder="What is this list for? A sentence or two is enough."
						className="min-h-24 resize-y"
					/>
				</Field>
			</ShelfEditorSection>

			<ShelfEditorSection title="Status">
				<ShelfOptionPicker
					name="shelf-status"
					label="Is it ready to show?"
					value={status}
					options={[...shelfVisibilityCreateOptions]}
					onChange={setStatus}
				/>
			</ShelfEditorSection>

			<ShelfEditorSection
				title="Who can see it"
				description="You can change this any time. Private shelves can still be shared with collaborators."
			>
				<ShelfOptionPicker
					name="shelf-access"
					label="Who can open this shelf?"
					value={access}
					options={[...shelfAccessOptions]}
					onChange={setAccess}
				/>
			</ShelfEditorSection>

			<ShelfEditorSection
				title="Display"
				description={`You can reorder anytime. Each shelf holds up to ${MAX_BOOKS_PER_SHELF} books.`}
			>
				<ShelfOptionPicker
					name="shelf-type"
					label="How should books appear?"
					value={type}
					options={[...shelfTypeOptions]}
					onChange={setType}
				/>
			</ShelfEditorSection>
		</ShelfEditorShell>
	);
}
