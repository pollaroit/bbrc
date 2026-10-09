"use client";

import { Button } from "@bbrc/ui/components/button";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { AdminTableExportDialog } from "@/components/blocks/admin-table-export-dialog";
import type { AdminTableExportConfig } from "@/lib/admin-table-export/configs";

type ListMetadata = {
	total: number;
	page: number;
	totalPages: number;
	prevPage: number | null;
	nextPage: number | null;
};

type AdminListTableFooterProps<TItem> = {
	summary: string;
	metadata: ListMetadata;
	onPageChange: (page: number) => void;
	exportConfig: AdminTableExportConfig<TItem>;
	listInput: Record<string, unknown>;
	currentPageItems: TItem[];
};

export function AdminListTableFooter<TItem>({
	summary,
	metadata,
	onPageChange,
	exportConfig,
	listInput,
	currentPageItems,
}: AdminListTableFooterProps<TItem>) {
	const [exportOpen, setExportOpen] = useState(false);

	return (
		<>
			<div className="flex flex-col gap-3">
				<p className="text-muted-foreground text-sm tabular-nums">{summary}</p>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setExportOpen(true)}
					>
						<DownloadIcon data-icon="inline-start" />
						Export
					</Button>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={metadata.prevPage == null}
							onClick={() => {
								if (metadata.prevPage != null) {
									onPageChange(metadata.prevPage);
								}
							}}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={metadata.nextPage == null}
							onClick={() => {
								if (metadata.nextPage != null) {
									onPageChange(metadata.nextPage);
								}
							}}
						>
							Next
						</Button>
					</div>
				</div>
			</div>
			<AdminTableExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				config={exportConfig}
				listInput={listInput}
				currentPageItems={currentPageItems}
			/>
		</>
	);
}
