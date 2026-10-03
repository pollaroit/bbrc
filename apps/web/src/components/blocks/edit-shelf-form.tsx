"use client";

import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Separator } from "@bbrc/ui/components/separator";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
	ShelfOptionPicker,
	shelfTypeOptions,
	shelfVisibilityOptionsForEdit,
} from "@/components/blocks/shelf-form-options";
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
		if (!shelfQuery.data?.isOwner) return;
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

	if (shelfQuery.isError || !shelfQuery.data?.isOwner) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "You cannot edit this shelf."}
			</p>
		);
	}

	const trimmedTitle = title.trim();
	const visibilityOptions = shelfVisibilityOptionsForEdit(
		shelfQuery.data.status,
	);

	return (
		<form
			className="flex max-w-2xl flex-col gap-8 pb-8"
			onSubmit={(event) => {
				event.preventDefault();
				if (!trimmedTitle) {
					toast.error("Add a title for your shelf.");
					return;
				}
				updateMutation.mutate({
					shelfSlug,
					title: trimmedTitle,
					description: description.trim() || null,
					status,
					type,
				});
			}}
		>
			<FieldSet>
				<FieldLegend>Basics</FieldLegend>
				<FieldDescription>
					Title and description appear at the top of the shelf page.
				</FieldDescription>
				<FieldGroup className="gap-4">
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
				</FieldGroup>
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend>Visibility</FieldLegend>
				{shelfQuery.data.status !== "draft" ? (
					<FieldDescription>
						This shelf has been public or archived before, so it cannot go back
						to draft.
					</FieldDescription>
				) : null}
				<FieldGroup>
					<ShelfOptionPicker
						name="edit-shelf-visibility"
						label="Who can see this shelf?"
						value={status}
						options={visibilityOptions}
						onChange={setStatus}
					/>
				</FieldGroup>
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend>Display</FieldLegend>
				<FieldGroup>
					<ShelfOptionPicker
						name="edit-shelf-type"
						label="How should books appear?"
						description={`Reorder from the shelf page. Up to ${MAX_BOOKS_PER_SHELF} books per shelf.`}
						value={type}
						options={[...shelfTypeOptions]}
						onChange={setType}
					/>
				</FieldGroup>
			</FieldSet>

			<div className="flex flex-col gap-3 border-border border-t pt-6 sm:flex-row sm:items-center">
				<LoadingButton type="submit" loading={updateMutation.isPending}>
					Save changes
				</LoadingButton>
				<Button
					type="button"
					variant="outline"
					render={
						<Link href={`/users/${username}/shelves/${shelfSlug}` as Route} />
					}
					nativeButton={false}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
