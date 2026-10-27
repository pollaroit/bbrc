"use client";

import type { BookExportFieldKey } from "@bbrc/api/modules/book/book-export.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Separator } from "@bbrc/ui/components/separator";
import { Sheet, SheetContent } from "@bbrc/ui/components/sheet";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ListingSideSheetBody,
	ListingSideSheetFooter,
	ListingSideSheetHeader,
	ListingSideSheetSection,
	listingSideSheetContentClassName,
} from "@/components/listing/listing-side-sheet";
import {
	bookExportFieldKeys,
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
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const exportFormats = [
	"csv",
	"json",
	"xml",
	"txt",
	"md",
	"html",
] as const satisfies readonly BookExportFormat[];

type BooksListExportMenuProps = {
	appearance?: "default" | "library";
};

export function BooksListExportMenu({
	appearance = "default",
}: BooksListExportMenuProps) {
	const t = useTranslations("books");
	const exportFormatLabels: Record<BookExportFormat, string> = {
		csv: "CSV",
		json: "JSON",
		xml: "XML",
		txt: t("export.formats.txt"),
		md: "Markdown",
		html: "HTML",
	};
	const filenameModeLabels: Record<BookExportFilenameMode, string> = {
		date: t("export.names.date"),
		dateTime: t("export.names.dateTime"),
		none: t("export.names.none"),
		custom: t("export.names.custom"),
	};
	const isLibrary = appearance === "library";
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
				toast.error(error.message ?? t("export.failed"));
			},
		}),
	);

	const previewFilename = buildBookExportFilename({
		mode: filenameMode,
		format,
		customBaseName,
	});

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
			toast.error(t("export.noFields"));
			return;
		}

		const result = await exportMutation.mutateAsync({
			...exportInput,
			limit: 5000,
		});

		if (result.count === 0) {
			toast.error(t("export.noBooks"));
			return;
		}

		const content = serializeBookExport(format, result.items, selectedFields);
		downloadTextFile(previewFilename, content, bookExportMimeTypes[format]);
		toast.success(t("export.done", { count: result.count }));
		setSheetOpen(false);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="outline"
							size="sm"
							className={cn(isLibrary && "bg-background")}
						/>
					}
				>
					<Download data-icon="inline-start" />
					{t("export.button")}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-48">
					{exportFormats.map((option) => (
						<DropdownMenuItem key={option} onClick={() => openConfig(option)}>
							{exportFormatLabels[option]}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent
					side="right"
					className={
						isLibrary
							? listingSideSheetContentClassName
							: "flex flex-col gap-0 sm:max-w-md"
					}
				>
					<ListingSideSheetHeader
						title={t("export.title")}
						description={t("export.description")}
					/>

					<ListingSideSheetBody>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">{exportFormatLabels[format]}</Badge>
							<span className="text-muted-foreground text-xs">
								{t("export.columnCount", {
									selected: selectedFields.length,
									total: bookExportFieldKeys.length,
								})}
							</span>
						</div>

						<ListingSideSheetSection title={t("export.fileName")}>
							<FieldSet className="gap-3">
								<FieldLegend className="sr-only">
									{t("export.fileName")}
								</FieldLegend>
								<Field>
									<FieldLabel htmlFor="export-filename-mode">
										{t("export.naming")}
									</FieldLabel>
									<Select
										value={filenameMode}
										onValueChange={(value) => {
											if (
												value === "date" ||
												value === "dateTime" ||
												value === "none" ||
												value === "custom"
											) {
												setFilenameMode(value);
											}
										}}
									>
										<SelectTrigger
											id="export-filename-mode"
											className="w-full bg-background"
										>
											<SelectValue placeholder={t("export.chooseNaming")}>
												{filenameModeLabels[filenameMode]}
											</SelectValue>
										</SelectTrigger>
										<SelectContent alignItemWithTrigger={false}>
											<SelectGroup>
												{(
													Object.keys(
														filenameModeLabels,
													) as BookExportFilenameMode[]
												).map((mode) => (
													<SelectItem key={mode} value={mode}>
														{filenameModeLabels[mode]}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								{filenameMode === "custom" ? (
									<Field>
										<FieldLabel htmlFor="export-custom-filename">
											{t("export.baseName")}
										</FieldLabel>
										<Input
											id="export-custom-filename"
											value={customBaseName}
											onChange={(event) =>
												setCustomBaseName(event.target.value)
											}
											placeholder={t("export.baseNamePlaceholder")}
											className="bg-background"
										/>
									</Field>
								) : null}
								<div className="border border-border bg-muted/20 px-3 py-2">
									<p className="text-muted-foreground text-xs">
										{t("export.preview")}
									</p>
									<p className="truncate font-mono text-foreground text-sm">
										{previewFilename}
									</p>
								</div>
							</FieldSet>
						</ListingSideSheetSection>

						<ListingSideSheetSection
							title={t("export.columns")}
							description={t("export.columnsHint")}
						>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="bg-background"
									onClick={() => {
										setSelectedFields([...bookExportFieldKeys]);
									}}
								>
									{t("export.selectAll")}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="bg-background"
									onClick={() => {
										setSelectedFields([]);
									}}
								>
									{t("export.clearAll")}
								</Button>
							</div>
							<Card className="gap-0 p-0">
								<ScrollArea className="h-64">
									<FieldGroup className="gap-0">
										{bookExportFieldKeys.map(
											(field: BookExportFieldKey, index) => (
												<div key={field}>
													{index > 0 ? <Separator /> : null}
													<Field
														orientation="horizontal"
														className="px-3 py-2.5"
													>
														<FieldLabel className="w-full gap-2 hover:bg-muted/30 has-data-checked:border-transparent has-data-checked:bg-transparent dark:has-data-checked:bg-transparent">
															<Checkbox
																id={`export-field-${field}`}
																checked={selectedFields.includes(field)}
																onCheckedChange={(checked) => {
																	toggleField(field, checked === true);
																}}
															/>
															<FieldTitle className="text-sm">
																{t(`export.fields.${field}`)}
															</FieldTitle>
														</FieldLabel>
													</Field>
												</div>
											),
										)}
									</FieldGroup>
								</ScrollArea>
							</Card>
						</ListingSideSheetSection>
					</ListingSideSheetBody>

					<ListingSideSheetFooter>
						<LoadingButton
							type="button"
							className="w-full sm:w-auto"
							loading={exportMutation.isPending}
							loadingText={t("export.exporting")}
							onClick={() => void handleExport()}
						>
							{t("export.download", { format: exportFormatLabels[format] })}
						</LoadingButton>
					</ListingSideSheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
