"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	FieldDescription,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Separator } from "@bbrc/ui/components/separator";
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

function parseOptionalInt(raw: string): number | undefined {
	if (raw.trim() === "") {
		return undefined;
	}

	const value = Number.parseInt(raw, 10);
	return Number.isNaN(value) ? undefined : value;
}

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

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader className="border-border border-b pb-4">
					<CardTitle className="text-base">Wishlist pool</CardTitle>
					<CardDescription>
						Only wishlist titles that pass read-after rules and match every
						filter below can appear on the poll.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6 pt-6">
					<FieldSet>
						<FieldLegend>Size and year</FieldLegend>
						<FieldGroup className="gap-4">
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
						</FieldGroup>
					</FieldSet>

					<Separator />

					<FieldSet>
						<FieldLegend>Quality and engagement</FieldLegend>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
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
							<div className="sm:col-span-2">
								<ListingIntegerRangeFields
									legend="Member reads (club-wide)"
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
							</div>
						</FieldGroup>
					</FieldSet>

					<Separator />

					<div className="grid gap-6 lg:grid-cols-2">
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
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="border-border border-b pb-4">
					<CardTitle className="text-base">Ballot rules</CardTitle>
					<CardDescription>
						How many options appear on the poll and how many each member may
						rank.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<FieldGroup className="flex flex-col gap-4">
						<form.Input
							name="poll.take"
							label="Options on the poll"
							render={(field, fieldState) => (
								<>
									<Input
										id={field.name}
										type="number"
										min={2}
										max={12}
										inputMode="numeric"
										aria-invalid={fieldState.invalid}
										value={field.value ?? ""}
										onChange={(event) => {
											field.onChange(parseOptionalInt(event.target.value));
										}}
										onBlur={field.onBlur}
										name={field.name}
										ref={field.ref}
										className="max-w-xs"
									/>
									<FieldDescription>Between 2 and 12.</FieldDescription>
								</>
							)}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<form.Input
								name="poll.minChoices"
								label="Minimum choices per voter"
								render={(field, fieldState) => (
									<Input
										id={field.name}
										type="number"
										min={1}
										max={12}
										inputMode="numeric"
										aria-invalid={fieldState.invalid}
										value={field.value ?? ""}
										onChange={(event) => {
											field.onChange(parseOptionalInt(event.target.value));
										}}
										onBlur={field.onBlur}
										name={field.name}
										ref={field.ref}
									/>
								)}
							/>
							<form.Input
								name="poll.maxChoices"
								label="Maximum choices per voter"
								render={(field, fieldState) => (
									<Input
										id={field.name}
										type="number"
										min={1}
										max={12}
										inputMode="numeric"
										aria-invalid={fieldState.invalid}
										value={field.value ?? ""}
										onChange={(event) => {
											field.onChange(parseOptionalInt(event.target.value));
										}}
										onBlur={field.onBlur}
										name={field.name}
										ref={field.ref}
									/>
								)}
							/>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>
		</div>
	);
}
