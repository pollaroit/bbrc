"use client";

import { FieldDescription } from "@bbrc/ui/components/field";
import { Label } from "@bbrc/ui/components/label";
import { useWatch } from "react-hook-form";
import { NumberStepper } from "@/components/blocks/number-stepper";
import type { AppFormReturn } from "@/hooks/use-app-form";
import type { CreateSittingFormValues } from "@/lib/create-sitting-form";

/** How many books are on the poll and how many each member can back. */
export function CreateSittingBallotFields({
	form,
}: {
	form: AppFormReturn<CreateSittingFormValues>;
}) {
	const [take, minChoices, maxChoices] = useWatch({
		control: form.control,
		name: ["poll.take", "poll.minChoices", "poll.maxChoices"],
	});

	const limit = take ?? 12;

	function changeTake(next: number) {
		form.setValue("poll.take", next, { shouldValidate: true });
		if ((maxChoices ?? 0) > next) {
			form.setValue("poll.maxChoices", next, { shouldValidate: true });
		}
		if ((minChoices ?? 0) > next) {
			form.setValue("poll.minChoices", next, { shouldValidate: true });
		}
	}

	const range =
		minChoices === maxChoices
			? `${maxChoices} ${maxChoices === 1 ? "book" : "books"}`
			: `${minChoices} to ${maxChoices} books`;

	return (
		<div className="flex flex-col gap-5">
			<form.Input
				name="poll.take"
				label="Books on the poll"
				render={(field) => (
					<>
						<NumberStepper
							id={field.name}
							value={field.value}
							min={3}
							max={12}
							onChange={changeTake}
						/>
						<FieldDescription>Between 3 and 12.</FieldDescription>
					</>
				)}
			/>

			<div className="flex flex-col gap-2">
				<Label>Books each member can pick</Label>
				<div className="grid gap-3 sm:grid-cols-2">
					<form.Input
						name="poll.minChoices"
						label="At least"
						render={(field) => (
							<NumberStepper
								id={field.name}
								value={field.value}
								min={1}
								max={limit}
								onChange={field.onChange}
							/>
						)}
					/>
					<form.Input
						name="poll.maxChoices"
						label="At most"
						render={(field) => (
							<NumberStepper
								id={field.name}
								value={field.value}
								min={1}
								max={limit}
								onChange={field.onChange}
							/>
						)}
					/>
				</div>
			</div>

			<p className="border border-border bg-muted/30 px-3 py-2.5 text-sm">
				Members pick {range} out of {take ?? "…"} on the poll.
			</p>
		</div>
	);
}
