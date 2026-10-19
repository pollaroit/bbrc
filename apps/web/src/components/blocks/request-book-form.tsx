"use client";

import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import {
	FieldDescription,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { OpenLibraryWorkResults } from "@/components/blocks/open-library-work-results";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { searchOpenLibraryWorks } from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { orpc, queryClient } from "@/utils/orpc";

function requireWorkOlid(work: OpenLibrarySearchWork): string {
	const olid = openLibraryWorkKeyToOlid(work.workKey);
	if (!olid) {
		throw new Error("Invalid Open Library work ID");
	}

	return olid;
}

type RequestBookFormProps = {
	canRequest: boolean;
};

export function RequestBookForm({ canRequest }: RequestBookFormProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedQuery = useDebouncedValue(searchQuery, 500);
	const [selectedWork, setSelectedWork] =
		useState<OpenLibrarySearchWork | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const trimmedQuery = debouncedQuery.trim();
	const searchEnabled = trimmedQuery.length >= 2 && selectedWork == null;

	const { data: searchData, isFetching: isSearching } = useQuery({
		queryKey: ["open-library-search", trimmedQuery],
		queryFn: () => searchOpenLibraryWorks(trimmedQuery),
		enabled: searchEnabled,
		staleTime: 60_000,
	});

	const createRequest = useMutation(
		orpc.bookRequest.create.mutationOptions({
			onSuccess: async () => {
				toast.success("Book request submitted. Admins will review it.");
				setConfirmOpen(false);
				setSelectedWork(null);
				setSearchQuery("");
				await invalidateUserPointQueries();
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listPending.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listMine.key(),
				});
				requestAnimationFrame(() => {
					searchInputRef.current?.focus();
				});
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const handleSelectWork = (work: OpenLibrarySearchWork) => {
		if (!openLibraryWorkKeyToOlid(work.workKey)) {
			toast.error(
				"This Open Library work could not be linked. Try another result.",
			);
			return;
		}

		setSelectedWork(work);
	};

	const handleSubmitRequest = () => {
		if (!selectedWork) {
			return;
		}

		try {
			createRequest.mutate({
				olid: requireWorkOlid(selectedWork),
				title: selectedWork.title.trim(),
				authors: selectedWork.authors,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not prepare request";
			toast.error(message);
		}
	};

	if (!canRequest) {
		return (
			<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
				As an admin you add books directly from{" "}
				<Link
					href={"/books/new" as Route}
					className="text-foreground underline"
				>
					Add book
				</Link>
				. Members use this page to request titles for the library.
			</p>
		);
	}

	const coverSrc = selectedWork
		? bookCoverUrl(selectedWork.coverId, "M")
		: null;

	return (
		<div className="flex flex-col gap-8">
			<div className="space-y-3">
				<FieldSet className="gap-3">
					<FieldLegend variant="label">Search Open Library</FieldLegend>
					<FieldDescription>
						Find a work by title or author, then confirm to send a request.
						Details come from Open Library and cannot be edited here.
					</FieldDescription>
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							type="search"
							value={searchQuery}
							placeholder="Search Open Library…"
							className="pl-8"
							disabled={selectedWork != null}
							onChange={(event) => {
								setSearchQuery(event.target.value);
							}}
						/>
					</div>
				</FieldSet>

				{selectedWork == null ? (
					<OpenLibraryWorkResults
						works={searchData?.works ?? []}
						selectedWorkKey={null}
						onSelect={handleSelectWork}
						isLoading={searchEnabled && isSearching}
					/>
				) : (
					<div className="flex flex-col gap-4 border border-border p-4 sm:flex-row sm:items-start sm:gap-6">
						<div className="relative mx-auto aspect-2/3 w-24 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:mx-0">
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes="96px"
								/>
							) : (
								<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
									No cover
								</div>
							)}
						</div>
						<div className="min-w-0 flex-1 space-y-3">
							<div>
								<p className="font-medium">{selectedWork.title}</p>
								<p className="text-muted-foreground text-sm">
									{formatBookAuthors(selectedWork.authors)}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									onClick={() => setConfirmOpen(true)}
								>
									Request this book
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setSelectedWork(null)}
								>
									Choose another
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			<AlertDialog
				open={confirmOpen}
				onOpenChange={(next) => {
					if (createRequest.isPending) {
						return;
					}
					setConfirmOpen(next);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
						<AlertDialogTitle>Submit book request?</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedWork ? (
								<>
									Request “{selectedWork.title}” by{" "}
									{formatBookAuthors(selectedWork.authors)} for the club
									library. Admins will review pending requests.
								</>
							) : (
								"Confirm your book request."
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={createRequest.isPending}>
							Cancel
						</AlertDialogCancel>
						<LoadingButton
							type="button"
							loading={createRequest.isPending}
							onClick={handleSubmitRequest}
						>
							Submit request
						</LoadingButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
