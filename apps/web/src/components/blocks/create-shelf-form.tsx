"use client";

import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

type CreateShelfFormProps = {
	username: string;
};

export function CreateShelfForm({ username }: CreateShelfFormProps) {
	const router = useRouter();
	const [returnTo] = useQueryState("returnTo", parseAsString);
	const [addBookSlug] = useQueryState("addBookSlug", parseAsString);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"draft" | "active" | "archived">(
		"draft",
	);
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

	return (
		<form
			className="mx-auto flex max-w-lg flex-col gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (!title.trim()) {
					toast.error("Title is required.");
					return;
				}
				createMutation.mutate({
					title: title.trim(),
					description: description.trim() || null,
					status,
					type,
					addBookSlug: addBookSlug ?? undefined,
				});
			}}
		>
			<div className="grid gap-2">
				<Label htmlFor="shelf-title">Title</Label>
				<Input
					id="shelf-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={120}
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="shelf-description">Description</Label>
				<Textarea
					id="shelf-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={2000}
					rows={4}
				/>
				<p className="text-muted-foreground text-xs">
					Optional. Shown on the shelf page.
				</p>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="shelf-status">Visibility</Label>
				<Select
					value={status}
					onValueChange={(value) =>
						setStatus(value as "draft" | "active" | "archived")
					}
				>
					<SelectTrigger id="shelf-status" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="draft">Draft (only you)</SelectItem>
						<SelectItem value="active">Active (public)</SelectItem>
						<SelectItem value="archived">Archived (only you)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="shelf-type">List style</Label>
				<Select
					value={type}
					onValueChange={(value) => setType(value as "ordered" | "unordered")}
				>
					<SelectTrigger id="shelf-type" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="unordered">List (no rank numbers)</SelectItem>
						<SelectItem value="ordered">Ranked (show 1, 2, 3…)</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-muted-foreground text-xs">
					Ranked shelves show order numbers on the public page.
				</p>
			</div>

			{addBookSlug ? (
				<p className="text-muted-foreground text-sm">
					After create,{" "}
					<span className="font-mono text-foreground">{addBookSlug}</span> will
					be added to this shelf.
				</p>
			) : null}

			<div className="flex flex-wrap gap-3">
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
