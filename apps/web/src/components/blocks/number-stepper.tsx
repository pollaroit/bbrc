"use client";

import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type NumberStepperProps = {
	id?: string;
	value: number | undefined;
	onChange: (value: number) => void;
	min: number;
	max: number;
	className?: string;
	"aria-label"?: string;
};

/** A number field with − and + buttons, easier to tap than a bare input. */
export function NumberStepper({
	id,
	value,
	onChange,
	min,
	max,
	className,
	"aria-label": ariaLabel,
}: NumberStepperProps) {
	const current = value ?? min;
	const clamp = (next: number) =>
		Math.min(
			max,
			Math.max(min, Number.isFinite(next) ? Math.round(next) : min),
		);

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Button
				type="button"
				variant="outline"
				size="icon"
				aria-label="Decrease"
				disabled={current <= min}
				onClick={() => onChange(clamp(current - 1))}
			>
				<Minus aria-hidden />
			</Button>
			<Input
				id={id}
				type="number"
				inputMode="numeric"
				min={min}
				max={max}
				value={value ?? ""}
				aria-label={ariaLabel}
				className="min-w-0 flex-1 text-center tabular-nums"
				onChange={(event) => onChange(clamp(Number(event.target.value)))}
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				aria-label="Increase"
				disabled={current >= max}
				onClick={() => onChange(clamp(current + 1))}
			>
				<Plus aria-hidden />
			</Button>
		</div>
	);
}
