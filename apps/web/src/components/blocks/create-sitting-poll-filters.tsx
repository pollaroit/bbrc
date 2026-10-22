"use client";

import { FieldDescription } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { useController, useWatch } from "react-hook-form";
import { ListingAuthorMultiSelect } from "@/components/listing/listing-author-multi-select";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import type { AppFormReturn } from "@/hooks/use-app-form";
import {
	type CreateSittingFormValues,
	toWishlistPollAuthorFacetsInput,
	toWishlistPollCountryFacetsInput,
	type WishlistPollFilterSlice,
} from "@/lib/create-sitting-form";

type CreateSittingPollFiltersProps = {
	form: AppFormReturn<CreateSittingFormValues>;
};

function parseOptionalRating(raw: string): number | undefined {
	if (raw.trim() === "") {
		return undefined;
	}

	const value = Number.parseFloat(raw);
	return Number.isNaN(value) ? undefined : value;
}

export function CreateSittingPollFilters({
	form,
}: CreateSittingPollFiltersProps) {
	const [
		minPages,
		maxPages,
		minPublishedIn,
		maxPublishedIn,
		minOpenLibraryRating,
		minReads,
		maxReads,
		countries,
		authors,
	] = useWatch({
		control: form.control,
		name: [
			"poll.minPages",
			"poll.maxPages",
			"poll.minPublishedIn",
			"poll.maxPublishedIn",
			"poll.minOpenLibraryRating",
			"poll.minReads",
			"poll.maxReads",
			"poll.countries",
			"poll.authors",
		],
	});

	const pollFilterSlice = useMemo((): WishlistPollFilterSlice => {
		return {
			minPages,
			maxPages,
			minPublishedIn,
			maxPublishedIn,
			minOpenLibraryRating,
			minReads,
			maxReads,
			countries: countries ?? [],
			authors: authors ?? [],
		};
	}, [
		authors,
		countries,
		maxPages,
		maxPublishedIn,
		maxReads,
		minOpenLibraryRating,
		minPages,
		minPublishedIn,
		minReads,
	]);

	const authorFacetInput = useMemo(
		() => toWishlistPollAuthorFacetsInput(pollFilterSlice),
		[pollFilterSlice],
	);
	const countryFacetInput = useMemo(
		() => toWishlistPollCountryFacetsInput(pollFilterSlice),
		[pollFilterSlice],
	);

	const countriesField = useController({
		name: "poll.countries",
		control: form.control,
	});

	const authorsField = useController({
		name: "poll.authors",
		control: form.control,
	});

	const sizeActive = [
		minPages,
		maxPages,
		minPublishedIn,
		maxPublishedIn,
	].filter((value) => value != null).length;
	const qualityActive = [minOpenLibraryRating, minReads, maxReads].filter(
		(value) => value != null,
	).length;
	const originActive = (countries?.length ?? 0) + (authors?.length ?? 0);

	return (
		<div className="flex flex-col gap-2">
			<FilterGroup title="Size and year" activeCount={sizeActive}>
				<ListingIntegerRangeFields
					legend="Page count"
					minId="sitting-poll-min-pages"
					maxId="sitting-poll-max-pages"
					min={minPages ?? null}
					max={maxPages ?? null}
					inputMin={0}
					onMinChange={(nextMin) => {
						form.setValue("poll.minPages", nextMin ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
					onMaxChange={(nextMax) => {
						form.setValue("poll.maxPages", nextMax ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
				/>
				<ListingIntegerRangeFields
					legend="First published (year)"
					minId="sitting-poll-min-published"
					maxId="sitting-poll-max-published"
					min={minPublishedIn ?? null}
					max={maxPublishedIn ?? null}
					inputMin={0}
					placeholderMin="e.g. 1900"
					placeholderMax="e.g. 2020"
					onMinChange={(nextMin) => {
						form.setValue("poll.minPublishedIn", nextMin ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
					onMaxChange={(nextMax) => {
						form.setValue("poll.maxPublishedIn", nextMax ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
				/>
			</FilterGroup>

			<FilterGroup title="Quality and reads" activeCount={qualityActive}>
				<form.Input
					name="poll.minOpenLibraryRating"
					label="Minimum Open Library rating"
					render={(field, fieldState) => (
						<>
							<Input
								id={field.name}
								type="number"
								min={0}
								max={5}
								step={0.1}
								inputMode="decimal"
								placeholder="e.g. 3.5"
								aria-invalid={fieldState.invalid}
								value={field.value ?? ""}
								onChange={(event) => {
									field.onChange(parseOptionalRating(event.target.value));
								}}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
							<FieldDescription>
								From 0 to 5. Leave empty for no minimum.
							</FieldDescription>
						</>
					)}
				/>
				<ListingIntegerRangeFields
					legend="Members who read it (club-wide)"
					minId="sitting-poll-min-reads"
					maxId="sitting-poll-max-reads"
					min={minReads ?? null}
					max={maxReads ?? null}
					inputMin={0}
					onMinChange={(nextMin) => {
						form.setValue("poll.minReads", nextMin ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
					onMaxChange={(nextMax) => {
						form.setValue("poll.maxReads", nextMax ?? undefined, {
							shouldDirty: true,
							shouldValidate: false,
						});
					}}
				/>
			</FilterGroup>

			<FilterGroup title="Origin and author" activeCount={originActive}>
				<ListingCountryMultiSelect
					legend="Literary origin"
					selectedAlpha2={countriesField.field.value}
					onSelectedAlpha2Change={countriesField.field.onChange}
					facetInput={countryFacetInput}
				/>
				<ListingAuthorMultiSelect
					selectedSlugs={authorsField.field.value}
					onSelectedSlugsChange={authorsField.field.onChange}
					facetInput={authorFacetInput}
				/>
			</FilterGroup>
		</div>
	);
}

/** A collapsible set of related filters; the badge counts how many are set. */
function FilterGroup({
	title,
	activeCount,
	children,
}: {
	title: string;
	activeCount: number;
	children: React.ReactNode;
}) {
	return (
		<details className="group border border-border" open={activeCount > 0}>
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-medium text-sm marker:hidden [&::-webkit-details-marker]:hidden">
				<span className="flex items-center gap-2">
					{title}
					{activeCount > 0 ? (
						<span className="border border-foreground px-1.5 py-0.5 font-normal text-xs tabular-nums">
							{activeCount} set
						</span>
					) : null}
				</span>
				<ChevronDown
					className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
					aria-hidden
				/>
			</summary>
			<div className="flex flex-col gap-5 border-border border-t px-3 py-4">
				{children}
			</div>
		</details>
	);
}
