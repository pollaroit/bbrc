"use client";

import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	AdminSeriesPreviewAside,
	AdminSeriesWorkspacePanel,
	AdminSeriesWorkspaceShell,
} from "@/components/blocks/admin-series-workspace-shell";
import { orpc } from "@/utils/orpc";

export function AdminSeriesCreateForm() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");

	const createMutation = useMutation(
		orpc.series.create.mutationOptions({
			onSuccess: (result) => {
				toast.success("Series created.");
				router.push(`/admin/series/${result.slug}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not create series.");
			},
		}),
	);

	return (
		<AdminSeriesWorkspaceShell
			title="New series"
			description="Name the series and write a short note for readers. You will add books and set reading order on the next screen."
			aside={
				<AdminSeriesPreviewAside
					title={title}
					description={description}
					bookCount={0}
				>
					<div className="border border-border border-dashed bg-background/50 p-4 text-muted-foreground text-xs leading-relaxed">
						The numbered book list from the public series page will appear here
						once you add titles on the edit screen.
					</div>
				</AdminSeriesPreviewAside>
			}
		>
			<AdminSeriesWorkspacePanel
				title="Series details"
				description="The title is required. Slug defaults from the title if you leave it blank."
			>
				<FieldGroup className="gap-4">
					<Field>
						<FieldLabel htmlFor="new-series-title">Title</FieldLabel>
						<Input
							id="new-series-title"
							value={title}
							autoFocus
							onChange={(event) => setTitle(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="new-series-slug">Slug</FieldLabel>
						<Input
							id="new-series-slug"
							value={slug}
							placeholder="Generated from title when empty"
							onChange={(event) => setSlug(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="new-series-description">
							Description for readers
						</FieldLabel>
						<Textarea
							id="new-series-description"
							value={description}
							rows={5}
							placeholder="Optional — context, edition notes, or how the club reads this sequence"
							onChange={(event) => setDescription(event.target.value)}
						/>
					</Field>
					<LoadingButton
						type="button"
						loading={createMutation.isPending}
						disabled={!title.trim()}
						onClick={() => {
							createMutation.mutate({
								title: title.trim(),
								slug: slug.trim() || undefined,
								description: description.trim() || undefined,
							});
						}}
					>
						Create and add books
					</LoadingButton>
				</FieldGroup>
			</AdminSeriesWorkspacePanel>
		</AdminSeriesWorkspaceShell>
	);
}
