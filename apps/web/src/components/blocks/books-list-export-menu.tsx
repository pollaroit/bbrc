"use client";

import type { BookExportFieldKey } from "@bbrc/api/modules/book/book-export.schema";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	bookExportFieldKeys,
	bookExportFieldLabels,
	defaultBookExportFieldKeys,
} from "@/lib/books/export-fields";
import {
	type BookExportFilenameMode,
	type BookExportFormat,
	buildBookExportFilename,
} from "@/lib/books/export-filename";
import {
	bookExportMimeTypes,
	downloadTextFile,
	serializeBookExport,
} from "@/lib/books/export-serialize";
import {
	toBookExportCallInput,
	useBookListingSearchParams,
} from "@/lib/listing/books-listing";
import { orpc } from "@/utils/orpc";

const exportFormatLabels: Record<BookExportFormat, string> = {
	csv: "CSV",
	json: "JSON",
	xml: "XML",
	txt: "Plain text (.txt)",
	md: "Markdown",
	html: "HTML",
};

const exportFormats = Object.keys(exportFormatLabels) as BookExportFormat[];

export function BooksListExportMenu() {
	const [params] = useBookListingSearchParams();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [format, setFormat] = useState<BookExportFormat>("csv");
	const [filenameMode, setFilenameMode] =
		useState<BookExportFilenameMode>("date");
	const [customBaseName, setCustomBaseName] = useState("");
	const [selectedFields, setSelectedFields] = useState<BookExportFieldKey[]>([
		...defaultBookExportFieldKeys,
	]);

	const exportInput = useMemo(() => toBookExportCallInput(params), [params]);

	const exportMutation = useMutation(
		orpc.book.exportBookList.mutationOptions({
			onError: (error) => {
				toast.error(error.message ?? "Export failed.");
			},
		}),
	);

	const openConfig = (nextFormat: BookExportFormat) => {
		setFormat(nextFormat);
		setSheetOpen(true);
	};

	const toggleField = (field: BookExportFieldKey, checked: boolean) => {
		setSelectedFields((current) => {
			if (checked) {
				return current.includes(field) ? current : [...current, field];
			}

			return current.filter((value) => value !== field);
		});
	};

	const handleExport = async () => {
		if (selectedFields.length === 0) {
			toast.error("Select at least one field.");
			return;
		}

		const result = await exportMutation.mutateAsync({
			...exportInput,
			limit: 5000,
		});

		if (result.count === 0) {
			toast.error("No books match the current filters.");
			return;
		}

		const content = serializeBookExport(format, result.items, selectedFields);
		const filename = buildBookExportFilename({
			mode: filenameMode,
			format,
			customBaseName,
		});

		downloadTextFile(filename, content, bookExportMimeTypes[format]);
		toast.success(`Exported ${result.count} books.`);
		setSheetOpen(false);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={<Button type="button" variant="outline" size="sm" />}
				>
					<Download data-icon="inline-start" />
					Export
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					{exportFormats.map((option) => (
						<DropdownMenuItem key={option} onClick={() => openConfig(option)}>
							{exportFormatLabels[option]}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Export book list</SheetTitle>
						<SheetDescription>
							Uses the current search, filters, and sort from this page. Format:{" "}
							{exportFormatLabels[format]}.
						</SheetDescription>
					</SheetHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
						<fieldset className="flex flex-col gap-2">
							<legend className="font-medium text-sm">File name</legend>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="export-filename-mode"
									checked={filenameMode === "date"}
									onChange={() => setFilenameMode("date")}
								/>
								Date only (DD-MM-YYYY-bbrclist)
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="export-filename-mode"
									checked={filenameMode === "dateTime"}
									onChange={() => setFilenameMode("dateTime")}
								/>
								Date and time (DD-MM-YYYY-HH-mm-bbrclist)
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="export-filename-mode"
									checked={filenameMode === "none"}
									onChange={() => setFilenameMode("none")}
								/>
								No date (bbrclist)
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="export-filename-mode"
									checked={filenameMode === "custom"}
									onChange={() => setFilenameMode("custom")}
								/>
								Custom name
							</label>
							{filenameMode === "custom" ? (
								<Input
									value={customBaseName}
									onChange={(event) => setCustomBaseName(event.target.value)}
									placeholder="my-export-name"
									className="mt-1"
								/>
							) : null}
							<p className="text-muted-foreground text-xs">
								Preview:{" "}
								{buildBookExportFilename({
									mode: filenameMode,
									format,
									customBaseName,
								})}
							</p>
						</fieldset>

						<fieldset className="flex flex-col gap-2">
							<legend className="font-medium text-sm">Fields</legend>
							{bookExportFieldKeys.map((field: BookExportFieldKey) => (
								<div key={field} className="flex items-center gap-2">
									<Checkbox
										id={`export-field-${field}`}
										checked={selectedFields.includes(field)}
										onCheckedChange={(checked) => {
											toggleField(field, checked === true);
										}}
									/>
									<Label htmlFor={`export-field-${field}`} className="text-sm">
										{bookExportFieldLabels[field]}
									</Label>
								</div>
							))}
						</fieldset>
					</div>

					<SheetFooter className="border-t px-4 py-4">
						<LoadingButton
							type="button"
							loading={exportMutation.isPending}
							loadingText="Exporting…"
							onClick={() => void handleExport()}
						>
							Download {exportFormatLabels[format]}
						</LoadingButton>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
