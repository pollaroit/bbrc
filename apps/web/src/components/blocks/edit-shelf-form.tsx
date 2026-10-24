"use client";

import { MAX_BOOKS_PER_SHELF, resolveShelfPermissions } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Field } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { MemberProfileShelfCard } from "@/components/blocks/member-profile-shelf-card";
import {
	ShelfEditorSection,
	ShelfEditorShell,
} from "@/components/blocks/shelf-editor-shell";
import {
	ShelfOptionPicker,
	shelfTypeOptions,
	shelfVisibilityOptionsForEdit,
} from "@/components/blocks/shelf-form-options";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { orpc, queryClient } from "@/utils/orpc";

type EditShelfFormProps = {
	username: string;
	shelfSlug: string;
};

export function EditShelfForm({ username, shelfSlug }: EditShelfFormProps) {
	const router = useRouter();
	const titleId = useId();
	const descriptionId = useId();

	const shelfQuery = useQuery(
		orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug },
		}),
	);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "active" | "archived">(
		"draft",
	);
	const [type, setType] = useState<"ordered" | "unordered">("unordered");

	useEffect(() => {
		if (!shelfQuery.data) return;
		setTitle(shelfQuery.data.title);
		setDescription(shelfQuery.data.description ?? "");
		setStatus(shelfQuery.data.status);
		setType(shelfQuery.data.type);
	}, [shelfQuery.data]);

	const updateMutation = useMutation(
		orpc.shelf.update.mutationOptions({
			onSuccess: async () => {
				toast.success("Shelf updated.");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				router.push(`/users/${username}/shelves/${shelfSlug}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not update shelf.");
			},
		}),
	);

	if (shelfQuery.isPending) {
		return <Skeleton className="h-96 w-full max-w-2xl" />;
	}

	const permissions = shelfQuery.data
		? resolveShelfPermissions(
				shelfQuery.data.viewer.role === "owner",
				shelfQuery.data.viewer.permissions,
			)
		: null;
	const canTitle = permissions?.has("edit_title") ?? false;
	const canDescription = permissions?.has("edit_description") ?? false;
	const canCover = permissions?.has("edit_cover") ?? false;
	const canStatus = permissions?.has("edit_status") ?? false;
	const canType = permissions?.has("edit_type") ?? false;
	const canEditAnything =
		canTitle || canDescription || canCover || canStatus || canType;

	if (shelfQuery.isError || !shelfQuery.data || !canEditAnything) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "You cannot edit this shelf."}
			</p>
		);
	}

	const trimmedTitle = title.trim();
	const shelf = shelfQuery.data;
	const visibilityOptions = shelfVisibilityOptionsForEdit(shelf.status);
	const unchanged =
		trimmedTitle === shelf.title &&
		(description.trim() || null) === (shelf.description ?? null) &&
		status === shelf.status &&
		type === shelf.type;
	const backHref = `/users/${username}/shelves/${shelfSlug}` as Route;

	return (
		<ShelfEditorShell
			title="Edit shelf"
			description="Update the title, visibility, and how books are shown on the page."
			backHref={backHref}
			backLabel="Back to shelf"
			preview={
				<MemberProfileShelfCard
					preview
					showStatus
					shelf={{
						...shelf,
						role: shelf.viewer.role === "owner" ? "owner" : "collaborator",
						owner: { username: shelf.owner.username, name: shelf.owner.name },
						collaboratorCount: shelf.collaborators.length,
						title: trimmedTitle || "Untitled shelf",
						description: description.trim() || null,
						status,
						type,
					}}
				/>
			}
			onSubmit={(event) => {
				event.preventDefault();
				if (!trimmedTitle) {
					toast.error("Add a title for your shelf.");
					return;
				}
				updateMutation.mutate({
					ownerUsername: username,
					shelfSlug,
					title: trimmedTitle,
					description: description.trim() || null,
					status,
					type,
				});
			}}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						render={<Link href={backHref} />}
						nativeButton={false}
					>
						Cancel
					</Button>
					<LoadingButton
						type="submit"
						loading={updateMutation.isPending}
						disabled={!trimmedTitle || unchanged}
					>
						Save changes
					</LoadingButton>
				</>
			}
		>
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
						disabled={!canTitle}
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
						disabled={!canDescription}
						maxLength={2000}
						rows={4}
						placeholder="What is this list for? A sentence or two is enough."
						className="min-h-24 resize-y"
					/>
				</Field>
			</ShelfEditorSection>

			{canCover ? (
				<ShelfEditorSection title="Cover">
					<SingleImageUploadField
						label="Cover image"
						description="Optional. Replaces the book-grid cover on lists and the shelf page."
						currentUrl={shelf.coverImageUrl}
						uploadTarget={{
							target: "shelf-cover",
							shelfSlug,
							ownerUsername: username,
						}}
						onRemove={async () => {
							await orpc.storage.removeShelfCoverUpload.call({
								shelfSlug,
								ownerUsername: username,
							});
						}}
						onSuccess={async () => {
							await queryClient.invalidateQueries({
								queryKey: orpc.shelf.getBySlug.key({
									input: { username, shelfSlug },
								}),
							});
							await queryClient.invalidateQueries({
								queryKey: orpc.shelf.listByUsername.key(),
							});
							router.refresh();
						}}
					/>
				</ShelfEditorSection>
			) : null}

			{canStatus ? (
				<ShelfEditorSection
					title="Visibility"
					description={
						shelf.status !== "draft"
							? "This shelf has been public or archived before, so it cannot go back to draft."
							: undefined
					}
				>
					<ShelfOptionPicker
						name="edit-shelf-visibility"
						label="Who can see this shelf?"
						value={status}
						options={visibilityOptions}
						columns={visibilityOptions.length === 3 ? 3 : 2}
						onChange={setStatus}
					/>
				</ShelfEditorSection>
			) : null}

			{canType ? (
				<ShelfEditorSection
					title="Display"
					description={`Reorder from the shelf page. Up to ${MAX_BOOKS_PER_SHELF} books per shelf.`}
				>
					<ShelfOptionPicker
						name="edit-shelf-type"
						label="How should books appear?"
						value={type}
						options={[...shelfTypeOptions]}
						onChange={setType}
					/>
				</ShelfEditorSection>
			) : null}
		</ShelfEditorShell>
	);
}
