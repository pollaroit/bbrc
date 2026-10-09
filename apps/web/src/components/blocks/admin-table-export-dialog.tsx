"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { Spinner } from "@bbrc/ui/components/spinner";
import { Switch } from "@bbrc/ui/components/switch";
import { DownloadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AdminTableExportConfig } from "@/lib/admin-table-export/configs";
import { defaultSelectedFieldKeys } from "@/lib/admin-table-export/configs";
import { fetchAllAdminTableItems } from "@/lib/admin-table-export/fetch-all-pages";
import {
	buildExportRows,
	defaultExportFilename,
	downloadExportFile,
	rowsToCsv,
	sanitizeExportFilename,
} from "@/lib/admin-table-export/format";
import {
	extractExportFilters,
	extractExportSorting,
	serializeExportMeta,
} from "@/lib/admin-table-export/list-meta";
import type {
	AdminTableExportFormat,
	AdminTableExportResource,
} from "@/lib/admin-table-export/types";

type AdminTableExportDialogProps<TItem> = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	config: AdminTableExportConfig<TItem>;
	listInput: Record<string, unknown>;
	currentPageItems: TItem[];
};

export function AdminTableExportDialog<TItem>({
	open,
	onOpenChange,
	config,
	listInput,
	currentPageItems,
}: AdminTableExportDialogProps<TItem>) {
	const [format, setFormat] = useState<AdminTableExportFormat>("json");
	const [filename, setFilename] = useState("");
	const [exportCurrentPageOnly, setExportCurrentPageOnly] = useState(false);
	const [includeFilters, setIncludeFilters] = useState(true);
	const [includeSorting, setIncludeSorting] = useState(true);
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() =>
		defaultSelectedFieldKeys(config.fields),
	);
	const [isExporting, setIsExporting] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		setFormat("json");
		setFilename(defaultExportFilename(config.resource, "json"));
		setExportCurrentPageOnly(false);
		setIncludeFilters(true);
		setIncludeSorting(true);
		setSelectedKeys(defaultSelectedFieldKeys(config.fields));
	}, [open, config.fields, config.resource]);

	function handleFormatChange(nextFormat: AdminTableExportFormat) {
		setFormat(nextFormat);
		setFilename((current) => {
			const base = current.trim().replace(/\.(json|csv)$/i, "");
			return sanitizeExportFilename(
				base.length > 0 ? base : `bbrc-${config.resource}-table`,
				nextFormat,
			);
		});
	}

	const fieldLabelsByKey = useMemo(
		() => new Map(config.fields.map((field) => [field.key, field.label])),
		[config.fields],
	);

	const selectedFieldKeys = useMemo(
		() =>
			config.fields
				.filter((field) => selectedKeys.has(field.key))
				.map((f) => f.key),
		[config.fields, selectedKeys],
	);

	function toggleField(key: string, checked: boolean) {
		setSelectedKeys((current) => {
			const next = new Set(current);
			if (checked) {
				next.add(key);
			} else {
				next.delete(key);
			}
			return next;
		});
	}

	function setAllFields(checked: boolean) {
		setSelectedKeys(
			checked ? new Set(config.fields.map((field) => field.key)) : new Set(),
		);
	}

	async function handleExport() {
		if (selectedFieldKeys.length === 0) {
			toast.error("Select at least one field to export.");
			return;
		}

		setIsExporting(true);
		try {
			const items = exportCurrentPageOnly
				? currentPageItems
				: await fetchAllAdminTableItems((page, limit) =>
						config.fetchPage({ ...listInput, page, limit }),
					);

			const rows = buildExportRows(items, config.fields, selectedKeys);
			const exportedFilename = sanitizeExportFilename(
				filename || defaultExportFilename(config.resource, format),
				format,
			);

			if (format === "csv") {
				const csv = rowsToCsv(rows, selectedFieldKeys, fieldLabelsByKey);
				downloadExportFile(csv, exportedFilename, "csv");
			} else {
				const payload: Record<string, unknown> = {
					exportedAt: new Date().toISOString(),
					resource: config.resource satisfies AdminTableExportResource,
					rowCount: rows.length,
					items: rows,
				};

				if (includeFilters) {
					payload.filters = serializeExportMeta(
						extractExportFilters(listInput),
					);
				}
				if (includeSorting) {
					const sorting = extractExportSorting(listInput);
					if (sorting) {
						payload.sorting = sorting;
					}
				}

				downloadExportFile(
					`${JSON.stringify(payload, null, 2)}\n`,
					exportedFilename,
					"json",
				);
			}

			toast.success(`Exported ${rows.length} rows.`);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Export failed. Try again.",
			);
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Export table</DialogTitle>
					<DialogDescription>
						Download {config.resource} list data with optional filters and
						sorting metadata.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<FieldSet>
						<FieldLegend>Format</FieldLegend>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant={format === "json" ? "default" : "outline"}
								size="sm"
								onClick={() => handleFormatChange("json")}
							>
								JSON
							</Button>
							<Button
								type="button"
								variant={format === "csv" ? "default" : "outline"}
								size="sm"
								onClick={() => handleFormatChange("csv")}
							>
								CSV
							</Button>
						</div>
					</FieldSet>

					<Field>
						<FieldLabel htmlFor="admin-export-filename">File name</FieldLabel>
						<Input
							id="admin-export-filename"
							value={filename}
							onChange={(event) => setFilename(event.target.value)}
							autoComplete="off"
						/>
						<FieldDescription>
							Default: {defaultExportFilename(config.resource, format)}
						</FieldDescription>
					</Field>

					<FieldSet>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<FieldLegend>Columns</FieldLegend>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setAllFields(true)}
								>
									Select all
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setAllFields(false)}
								>
									Clear
								</Button>
							</div>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							{config.fields.map((field) => (
								<div key={field.key} className="flex items-start gap-2">
									<Checkbox
										id={`export-field-${field.key}`}
										checked={selectedKeys.has(field.key)}
										onCheckedChange={(checked) => {
											toggleField(field.key, checked === true);
										}}
									/>
									<FieldLabel
										htmlFor={`export-field-${field.key}`}
										className="font-normal"
									>
										{field.label}
									</FieldLabel>
								</div>
							))}
						</div>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Options</FieldLegend>
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between gap-4">
								<div className="flex flex-col gap-0.5">
									<FieldTitle>Export only current page</FieldTitle>
									<FieldDescription>
										When off, exports every row matching the current filters.
									</FieldDescription>
								</div>
								<Switch
									checked={exportCurrentPageOnly}
									onCheckedChange={setExportCurrentPageOnly}
									aria-label="Export only current page"
								/>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex flex-col gap-0.5">
									<Label>Include filters</Label>
									<FieldDescription>
										Search, date ranges, and sheet filters (JSON only).
									</FieldDescription>
								</div>
								<Switch
									checked={includeFilters}
									onCheckedChange={setIncludeFilters}
									disabled={format === "csv"}
									aria-label="Include filters"
								/>
							</div>
							<div className="flex items-center justify-between gap-4">
								<div className="flex flex-col gap-0.5">
									<Label>Include sorting</Label>
									<FieldDescription>
										Current table sort column and direction (JSON only).
									</FieldDescription>
								</div>
								<Switch
									checked={includeSorting}
									onCheckedChange={setIncludeSorting}
									disabled={format === "csv"}
									aria-label="Include sorting"
								/>
							</div>
						</div>
					</FieldSet>
				</FieldGroup>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => void handleExport()}
						disabled={isExporting}
					>
						{isExporting ? <Spinner data-icon="inline-start" /> : null}
						<DownloadIcon
							data-icon={isExporting ? undefined : "inline-start"}
						/>
						Export
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
