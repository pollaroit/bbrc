"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { client, orpc } from "@/utils/orpc";

const reasonText = {
	openlibrary_id: "has the same Open Library record",
	wikidata_id: "has the same Wikidata record",
	alias: "is already in the library under another spelling",
	name: "has exactly this name",
	similar: "has a very similar name",
} as const;

type Duplicate = {
	author: {
		id: string;
		slug: string;
		name: string;
		photoUrl: string | null;
		bookCount: number;
	};
	reason: keyof typeof reasonText;
};

const editHref = (slug: string) => `/authors/${slug}/edit` as Route;

export function AuthorCreateForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [openLibraryId, setOpenLibraryId] = useState<string | null>(null);
	const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
	const debounced = useDebouncedValue(name, 300).trim();

	const suggestions = useQuery({
		...orpc.authorAdmin.search.queryOptions({ input: { query: debounced } }),
		enabled: debounced.length >= 2,
	});

	const create = useMutation({
		mutationFn: (force: boolean) =>
			client.authorAdmin.create({
				name: name.trim(),
				...(openLibraryId ? { openLibraryId } : {}),
				...(force ? { force: true } : {}),
			}),
		onSuccess: (result) => {
			if (!result.created) {
				setDuplicate({
					author: result.author,
					reason: result.match ?? "similar",
				});
				return;
			}
			invalidateAuthorQueries();
			toast.success(
				`Added ${result.author.name}. Details are being filled in.`,
			);
			router.push(editHref(result.author.slug));
		},
		onError: (error) =>
			toast.error(error.message || "Could not add this author."),
	});

	const trimmed = name.trim();
	const ours = suggestions.data?.authors ?? [];
	const fromOpenLibrary = suggestions.data?.openLibrary ?? [];

	return (
		<div className="flex w-full max-w-4xl flex-col gap-6">
			<div className="flex flex-col gap-3">
				<Link
					href={"/authors" as Route}
					className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					All authors
				</Link>
				<h1 className="font-bold text-2xl tracking-tight">Add an author</h1>
				<p className="text-muted-foreground text-sm">
					Authors are usually created when you add a book. Use this to add one
					on their own. Their details are looked up from Open Library, Wikidata
					and Wikipedia after you add them.
				</p>
			</div>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Name</CardTitle>
					<CardDescription>
						Search first: the author may already be here under another spelling.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="new-author-name">Author name</FieldLabel>
						<Input
							id="new-author-name"
							value={name}
							autoFocus
							autoComplete="off"
							maxLength={200}
							placeholder="e.g. Fyodor Dostoevsky"
							onChange={(event) => {
								setName(event.target.value);
								setOpenLibraryId(null);
								setDuplicate(null);
							}}
						/>
						{openLibraryId ? (
							<FieldDescription>
								Linked to Open Library record {openLibraryId}.{" "}
								<button
									type="button"
									className="underline underline-offset-4"
									onClick={() => setOpenLibraryId(null)}
								>
									Unlink
								</button>
							</FieldDescription>
						) : null}
					</Field>

					{ours.length > 0 ? (
						<div className="flex flex-col gap-2">
							<p className="font-medium text-sm">Already in the library</p>
							<ul className="divide-y divide-border border border-border">
								{ours.map((author) => (
									<li key={author.id}>
										<Link
											href={editHref(author.slug)}
											className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40"
										>
											<AuthorPhoto
												size="sm"
												name={author.name}
												photoUrl={author.photoUrl}
											/>
											<span className="flex min-w-0 flex-1 flex-col">
												<span className="truncate font-medium text-sm">
													{author.name}
												</span>
												<span className="truncate text-muted-foreground text-xs tabular-nums">
													{[
														author.lifespan,
														`${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`,
													]
														.filter(Boolean)
														.join(" · ")}
												</span>
											</span>
											<span className="text-muted-foreground text-xs">
												Open
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}

					{fromOpenLibrary.length > 0 && !openLibraryId ? (
						<div className="flex flex-col gap-2">
							<p className="font-medium text-sm">From Open Library</p>
							<ul className="divide-y divide-border border border-border">
								{fromOpenLibrary.map((hit) => (
									<li key={hit.olid}>
										<button
											type="button"
											className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted/40"
											onClick={() => {
												setName(hit.name);
												setOpenLibraryId(hit.olid);
												setDuplicate(null);
											}}
										>
											<span className="font-medium text-sm">{hit.name}</span>
											<span className="text-muted-foreground text-xs">
												{[
													hit.birthYear ? `born ${hit.birthYear}` : null,
													hit.topWork ? `known for ${hit.topWork}` : null,
												]
													.filter(Boolean)
													.join(" · ") || hit.olid}
											</span>
											{hit.looksLike ? (
												<span className="text-warning-ink text-xs">
													Looks like {hit.looksLike.name}, already in the
													library
												</span>
											) : null}
										</button>
									</li>
								))}
							</ul>
						</div>
					) : null}

					{duplicate ? (
						<div className="flex flex-col gap-3 border border-warning/40 bg-warning/10 p-3">
							<p className="text-sm">
								Looks like <strong>{duplicate.author.name}</strong>{" "}
								{reasonText[duplicate.reason]}.
							</p>
							<div className="flex items-center gap-3">
								<AuthorPhoto
									size="md"
									name={duplicate.author.name}
									photoUrl={duplicate.author.photoUrl}
								/>
								<span className="text-muted-foreground text-xs tabular-nums">
									{duplicate.author.bookCount}{" "}
									{duplicate.author.bookCount === 1 ? "book" : "books"} in the
									library
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									render={<Link href={editHref(duplicate.author.slug)} />}
									nativeButton={false}
								>
									Use {duplicate.author.name}
								</Button>
								{duplicate.reason !== "openlibrary_id" ? (
									<LoadingButton
										type="button"
										variant="outline"
										size="sm"
										loading={create.isPending}
										onClick={() => create.mutate(true)}
									>
										Different person
									</LoadingButton>
								) : null}
							</div>
						</div>
					) : null}

					<div className="flex justify-end">
						<LoadingButton
							type="button"
							loading={create.isPending && !duplicate}
							disabled={trimmed === "" || duplicate != null}
							onClick={() => create.mutate(false)}
						>
							<UserPlus data-icon="inline-start" />
							Add author
						</LoadingButton>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
