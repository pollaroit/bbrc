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
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
	ShelfOptionPicker,
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
		<form
			className="flex max-w-2xl flex-col gap-8 pb-8"
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
					addBookSlug: addBookSlug ?? undefined,
				});
			}}
		>
			{addBookSlug ? (
				<div className="border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
					<p className="font-medium">Adding a book after create</p>
					<p className="mt-1 text-muted-foreground">
						When you save,{" "}
						<span className="font-mono text-foreground">{addBookSlug}</span>{" "}
						will be placed on this shelf automatically.
					</p>
				</div>
			) : null}

			<FieldSet>
				<FieldLegend>Basics</FieldLegend>
				<FieldDescription>
					Give the shelf a clear name. Description is optional and appears under
					the title on the shelf page.
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
				<FieldGroup>
					<ShelfOptionPicker
						name="shelf-visibility"
						label="Who can see this shelf?"
						value={status}
						options={[...shelfVisibilityCreateOptions]}
						onChange={setStatus}
					/>
				</FieldGroup>
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend>Display</FieldLegend>
				<FieldGroup>
					<ShelfOptionPicker
						name="shelf-type"
						label="How should books appear?"
						description={`You can reorder anytime. Each shelf holds up to ${MAX_BOOKS_PER_SHELF} books.`}
						value={type}
						options={[...shelfTypeOptions]}
						onChange={setType}
					/>
				</FieldGroup>
			</FieldSet>

			<div className="flex flex-col gap-3 border-border border-t pt-6 sm:flex-row sm:items-center">
				<LoadingButton type="submit" loading={createMutation.isPending}>
					Create shelf
				</LoadingButton>
				<Button
					type="button"
					variant="outline"
					render={<Link href={cancelHref} />}
					nativeButton={false}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
