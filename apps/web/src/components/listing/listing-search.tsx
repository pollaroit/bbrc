"use client";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingSearchProps = {
	value: string;
	onChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
};

export function ListingSearch({
	value,
	onChange,
	placeholder = "Search…",
	className,
}: ListingSearchProps) {
	return (
		<InputGroup className={cn("relative min-w-0 flex-1", className)}>
			<InputGroupInput
				type="search"
				value={value}
				placeholder={placeholder}
				className="pl-8"
				onChange={(event) => {
					const next = event.target.value;
					onChange(next === "" ? null : next);
				}}
			/>
			<InputGroupAddon align="inline-start">
				<Search className="pointer-events-none size-4 text-muted-foreground" />
			</InputGroupAddon>
		</InputGroup>
	);
}
