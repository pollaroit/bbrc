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
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

type EditShelfFormProps = {
	username: string;
	shelfSlug: string;
};

export function EditShelfForm({ username, shelfSlug }: EditShelfFormProps) {
	const router = useRouter();

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
		return <Skeleton className="h-64 w-full max-w-lg" />;
	}

	if (shelfQuery.isError || !shelfQuery.data?.isOwner) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "You cannot edit this shelf."}
			</p>
		);
	}

	return (
		<form
			className="mx-auto flex max-w-lg flex-col gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (!title.trim()) {
					toast.error("Title is required.");
					return;
				}
				updateMutation.mutate({
					shelfSlug,
					title: title.trim(),
					description: description.trim() || null,
					status,
					type,
				});
			}}
		>
			<div className="grid gap-2">
				<Label htmlFor="edit-shelf-title">Title</Label>
				<Input
					id="edit-shelf-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={120}
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="edit-shelf-description">Description</Label>
				<Textarea
					id="edit-shelf-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={2000}
					rows={4}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="edit-shelf-status">Visibility</Label>
				<Select
					value={status}
					onValueChange={(value) =>
						setStatus(value as "draft" | "active" | "archived")
					}
				>
					<SelectTrigger id="edit-shelf-status" className="w-full">
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
				<Label htmlFor="edit-shelf-type">List style</Label>
				<Select
					value={type}
					onValueChange={(value) => setType(value as "ordered" | "unordered")}
				>
					<SelectTrigger id="edit-shelf-type" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="unordered">List (no rank numbers)</SelectItem>
						<SelectItem value="ordered">Ranked (show 1, 2, 3…)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-wrap gap-3">
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
