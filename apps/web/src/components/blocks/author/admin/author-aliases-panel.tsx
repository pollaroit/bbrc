"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

export function AuthorAliasesPanel({
	authorId,
	aliases,
	onChanged,
}: {
	authorId: string;
	aliases: { id: string; alias: string }[];
	onChanged: () => void;
}) {
	const [draft, setDraft] = useState("");

	const add = useMutation({
		mutationFn: (alias: string) =>
			client.authorAdmin.aliases.add({ id: authorId, alias }),
		onSuccess: () => {
			setDraft("");
			toast.success("Spelling added.");
			onChanged();
		},
		onError: (error) =>
			toast.error(error.message || "Could not add that spelling."),
	});

	const submitDraft = () => {
		const alias = draft.trim();
		if (alias && !add.isPending) add.mutate(alias);
	};

	const remove = useMutation({
		mutationFn: (aliasId: string) =>
			client.authorAdmin.aliases.remove({ id: authorId, aliasId }),
		onSuccess: () => {
			toast.success("Spelling removed.");
			onChanged();
		},
		onError: (error) =>
			toast.error(error.message || "Could not remove that spelling."),
	});

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Other spellings</CardTitle>
				<CardDescription>
					Searches and the add-book form find this author by any of these.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{aliases.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{aliases.map((alias) => (
							<li
								key={alias.id}
								className="inline-flex items-center gap-1 border border-border bg-muted/30 py-0.5 ps-2 pe-0.5 text-sm"
							>
								<span>{alias.alias}</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									aria-label={`Remove ${alias.alias}`}
									disabled={remove.isPending}
									onClick={() => remove.mutate(alias.id)}
								>
									<X />
								</Button>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">
						No other spellings yet.
					</p>
				)}
				{/* Not a <form>: this panel sits inside the editor's own form. */}
				<div className="flex gap-2">
					<Input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.nativeEvent.isComposing) {
								event.preventDefault();
								submitDraft();
							}
						}}
						placeholder="e.g. Dostoevski"
						maxLength={200}
						aria-label="New spelling"
					/>
					<LoadingButton
						type="button"
						variant="outline"
						loading={add.isPending}
						disabled={draft.trim() === ""}
						onClick={submitDraft}
					>
						<Plus data-icon="inline-start" />
						Add
					</LoadingButton>
				</div>
			</CardContent>
		</Card>
	);
}
