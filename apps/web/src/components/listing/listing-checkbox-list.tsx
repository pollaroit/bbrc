"use client";

import { Card } from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Separator } from "@bbrc/ui/components/separator";
import { Fragment } from "react";

export type ListingCheckboxListOption = {
	id: string;
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
};

type ListingCheckboxListProps = {
	legend?: string;
	options: ListingCheckboxListOption[];
};

export function ListingCheckboxList({
	legend,
	options,
}: ListingCheckboxListProps) {
	const list = (
		<Card className="w-full p-0">
			<FieldGroup className="gap-0">
				{options.map((option, index) => (
					<Fragment key={option.id}>
						{index > 0 ? <Separator /> : null}
						<Field orientation="horizontal" className="gap-0">
							<FieldLabel className="w-full px-4 py-3">
								<Checkbox
									checked={option.checked}
									onCheckedChange={(value) => {
										option.onCheckedChange(value === true);
									}}
								/>
								<FieldTitle className="text-foreground text-sm">
									{option.label}
								</FieldTitle>
							</FieldLabel>
						</Field>
					</Fragment>
				))}
			</FieldGroup>
		</Card>
	);

	if (!legend) {
		return list;
	}

	return (
		<FieldSet className="gap-3">
			<FieldLegend>{legend}</FieldLegend>
			{list}
		</FieldSet>
	);
}
