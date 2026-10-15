"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { ListingSearch } from "@/components/listing/listing-search";
import {
	bookEditionLanguageFilterValues,
	bookEditionLanguageLabels,
	useBookEditionsListingSearchParams,
} from "@/lib/listing/book-editions-listing";

export function BookEditionsToolbar() {
	const [params, setParams] = useBookEditionsListingSearchParams();

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search, page: 1 });
				}}
				placeholder="Search title, publisher, ISBN…"
				className="w-full sm:max-w-md"
			/>
			<div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[12rem]">
				<label
					htmlFor="book-editions-language"
					className="text-muted-foreground text-xs"
				>
					Language
				</label>
				<Select
					value={params.language}
					onValueChange={(language) => {
						void setParams({
							language: language as typeof params.language,
							page: 1,
						});
					}}
				>
					<SelectTrigger id="book-editions-language" className="w-full">
						<SelectValue placeholder="All languages" />
					</SelectTrigger>
					<SelectContent>
						{bookEditionLanguageFilterValues.map((value) => (
							<SelectItem key={value} value={value}>
								{bookEditionLanguageLabels[value]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
