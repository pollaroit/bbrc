"use client";

import type { UserReadExportFieldKey } from "@bbrc/api/modules/read/read-export.schema";
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
import type { BookExportFilenameMode } from "@/lib/books/export-filename";
import {
	toUserReadsExportCallInput,
	useUserReadsListingSearchParams,
} from "@/lib/listing/user-reads-listing";
import {
	defaultUserReadExportFieldKeys,
	userReadExportFieldKeys,
	userReadExportFieldLabels,
} from "@/lib/reads/export-fields";
import {
	buildUserReadExportFilename,
	type UserReadExportFormat,
} from "@/lib/reads/export-filename";
import {
	downloadTextFile,
	serializeUserReadExport,
	userReadExportMimeTypes,
} from "@/lib/reads/export-serialize";
import { orpc } from "@/utils/orpc";

const exportFormatLabels: Record<UserReadExportFormat, string> = {
	csv: "CSV",
	json: "JSON",
	xml: "XML",
	txt: "Plain text (.txt)",
	md: "Markdown",
	html: "HTML",
	"goodreads-csv": "Goodreads CSV",
};

const standardExportFormats = (
	Object.keys(exportFormatLabels) as UserReadExportFormat[]
).filter((format) => format !== "goodreads-csv");

type UserReadsExportMenuProps = {
	username: string;
	isOwnProfile: boolean;
};

export function UserReadsExportMenu({
	username,
	isOwnProfile,
}: UserReadsExportMenuProps) {
	const [params] = useUserReadsListingSearchParams();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [format, setFormat] = useState<UserReadExportFormat>("csv");
	const [filenameMode, setFilenameMode] =
		useState<BookExportFilenameMode>("date");
	const [customBaseName, setCustomBaseName] = useState("");
	const [selectedFields, setSelectedFields] = useState<
		UserReadExportFieldKey[]
	>([...defaultUserReadExportFieldKeys]);

	const exportInput = useMemo(
		() => toUserReadsExportCallInput(params),
		[params],
	);

	const exportMutation = useMutation(
		orpc.read.exportForUser.mutationOptions({
			onError: (error) => {
				toast.error(error.message ?? "Export failed.");
			},
		}),
	);

	const isGoodreadsFormat = format === "goodreads-csv";

	const openConfig = (nextFormat: UserReadExportFormat) => {
		setFormat(nextFormat);
		setSheetOpen(true);
	};

	const toggleField = (field: UserReadExportFieldKey, checked: boolean) => {
		setSelectedFields((current) => {
			if (checked) {
				return current.includes(field) ? current : [...current, field];
			}

			return current.filter((value) => value !== field);
		});
	};

	const handleExport = async () => {
		if (!isGoodreadsFormat && selectedFields.length === 0) {
			toast.error("Select at least one field.");
			return;
		}

		const result = await exportMutation.mutateAsync({
			username,
			...exportInput,
			limit: 5000,
		});

		if (result.count === 0) {
			toast.error("No reads match the current filters.");
			return;
		}

		const content = serializeUserReadExport(
			format,
			result.items,
			selectedFields,
		);
		const filename = buildUserReadExportFilename({
			mode: filenameMode,
			format,
			customBaseName,
		});

		downloadTextFile(filename, content, userReadExportMimeTypes[format]);
		toast.success(`Exported ${result.count} reads.`);
		setSheetOpen(false);
	};

	const triggerLabel = isOwnProfile ? "Export" : "Export";

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={<Button type="button" variant="outline" size="sm" />}
				>
					<Download data-icon="inline-start" />
					{triggerLabel}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-48">
					{standardExportFormats.map((option) => (
						<DropdownMenuItem key={option} onClick={() => openConfig(option)}>
							{exportFormatLabels[option]}
						</DropdownMenuItem>
					))}
					<DropdownMenuItem onClick={() => openConfig("goodreads-csv")}>
						{exportFormatLabels["goodreads-csv"]}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>
							{isGoodreadsFormat ? "Export Goodreads CSV" : "Export read list"}
						</SheetTitle>
						<SheetDescription>
							Uses the current search, filters, and sort from this page.
							{isGoodreadsFormat
								? " Matches Goodreads library export columns so other sites can import your reads."
								: ` Format: ${exportFormatLabels[format]}.`}
						</SheetDescription>
					</SheetHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
						<fieldset className="flex flex-col gap-2">
							<legend className="font-medium text-sm">File name</legend>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="user-read-export-filename-mode"
									checked={filenameMode === "date"}
									onChange={() => setFilenameMode("date")}
								/>
								Date only
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="user-read-export-filename-mode"
									checked={filenameMode === "dateTime"}
									onChange={() => setFilenameMode("dateTime")}
								/>
								Date and time
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="user-read-export-filename-mode"
									checked={filenameMode === "none"}
									onChange={() => setFilenameMode("none")}
								/>
								No date prefix
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="user-read-export-filename-mode"
									checked={filenameMode === "custom"}
									onChange={() => setFilenameMode("custom")}
								/>
								Custom name
							</label>
							{filenameMode === "custom" ? (
								<Input
									value={customBaseName}
									onChange={(event) => setCustomBaseName(event.target.value)}
									placeholder="my-reads-export"
									className="mt-1"
								/>
							) : null}
							<p className="text-muted-foreground text-xs">
								Preview:{" "}
								{buildUserReadExportFilename({
									mode: filenameMode,
									format,
									customBaseName,
								})}
							</p>
						</fieldset>

						{isGoodreadsFormat ? (
							<p className="text-muted-foreground text-sm">
								Goodreads-only fields we cannot fill (Book Id, Author l-f,
								bookshelves, private notes) are left empty. ISBN and publisher
								come from the Open Library edition when you logged one.
							</p>
						) : (
							<fieldset className="flex flex-col gap-2">
								<legend className="font-medium text-sm">Fields</legend>
								{userReadExportFieldKeys.map(
									(field: UserReadExportFieldKey) => (
										<div key={field} className="flex items-center gap-2">
											<Checkbox
												id={`user-read-export-field-${field}`}
												checked={selectedFields.includes(field)}
												onCheckedChange={(checked) => {
													toggleField(field, checked === true);
												}}
											/>
											<Label
												htmlFor={`user-read-export-field-${field}`}
												className="text-sm"
											>
												{userReadExportFieldLabels[field]}
											</Label>
										</div>
									),
								)}
							</fieldset>
						)}
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
