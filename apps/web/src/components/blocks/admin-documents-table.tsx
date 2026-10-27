"use client";

import { documentLanguageLabel } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { AdminDocumentsToolbar } from "@/components/blocks/admin-documents-toolbar";
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { Link } from "@/i18n/navigation";
import { adminDocumentsExportConfig } from "@/lib/admin-table-export/configs";
import {
	adminDocumentStatusLabels,
	toAdminDocumentsListCallInput,
	useAdminDocumentsListingSearchParams,
} from "@/lib/listing/admin-documents-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function truncateNote(text: string | null, max = 80): string {
	if (!text?.trim()) {
		return "—";
	}
	const trimmed = text.trim();
	if (trimmed.length <= max) {
		return trimmed;
	}
	return `${trimmed.slice(0, max - 1)}…`;
}

function statusBadgeVariant(
	status: "pending" | "approved" | "rejected",
): "secondary" | "default" | "destructive" {
	if (status === "approved") {
		return "default";
	}
	if (status === "rejected") {
		return "destructive";
	}
	return "secondary";
}

export function AdminDocumentsTable() {
	const [params, setParams] = useAdminDocumentsListingSearchParams();
	const listInput = toAdminDocumentsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listDocuments.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminDocumentsToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load documents."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">
							No documents match these filters
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} documents · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminDocumentsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={`table-fixed ${ADMIN_TABLE_MOBILE_MIN_WIDTH}`}>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[min(14rem,32vw)]">Name</TableHead>
									<TableHead className="hidden md:table-cell">Book</TableHead>
									<TableHead>Submitter</TableHead>
									<TableHead className="hidden sm:table-cell">
										Language
									</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden lg:table-cell">
										Submitted
									</TableHead>
									<TableHead className="hidden xl:table-cell">
										Notes / rejection
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((document) => {
									const noteSnippet =
										document.status === "rejected"
											? truncateNote(document.rejectionReason)
											: truncateNote(document.acceptanceNotes);

									return (
										<TableRow key={document.id}>
											<TableCell className="w-[min(14rem,32vw)]">
												<div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
													<p className="truncate text-sm" title={document.name}>
														{document.name}
													</p>
													<p
														className="truncate font-mono text-muted-foreground text-xs"
														title={document.slug}
													>
														{document.slug}
													</p>
												</div>
											</TableCell>
											<TableCell className="hidden max-w-48 md:table-cell">
												<Link
													href={`/books/${document.book.slug}` as Route}
													className="line-clamp-2 text-sm hover:underline"
												>
													{document.book.title}
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={
														`/users/${document.submitter.username}` as Route
													}
													className="text-sm hover:underline"
												>
													@{document.submitter.username}
												</Link>
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs sm:table-cell">
												{documentLanguageLabel(document.language)}
											</TableCell>
											<TableCell>
												<Badge variant={statusBadgeVariant(document.status)}>
													{adminDocumentStatusLabels[document.status]}
												</Badge>
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
												{formatDate(document.createdAt)}
											</TableCell>
											<TableCell
												className="hidden max-w-xs truncate text-muted-foreground text-xs xl:table-cell"
												title={
													document.rejectionReason ??
													document.acceptanceNotes ??
													undefined
												}
											>
												{noteSnippet}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} documents · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminDocumentsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
