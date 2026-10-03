"use client";

import {
	DOCUMENT_LANGUAGE_CODES,
	DOCUMENT_LANGUAGE_LABELS,
	type DocumentLanguageCode,
} from "@bbrc/shared";
import { cn } from "@/lib/utils";

const documentLanguageOptions: {
	value: DocumentLanguageCode;
	description: string;
}[] = [
	{
		value: "en",
		description: "Study guides, summaries, or notes in English.",
	},
	{
		value: "tr",
		description: "Turkish translations or commentary.",
	},
	{
		value: "az",
		description: "Azerbaijani translations or commentary.",
	},
	{
		value: "ru",
		description: "Russian translations or commentary.",
	},
];

type DocumentLanguagePickerProps = {
	value: DocumentLanguageCode;
	onChange: (value: DocumentLanguageCode) => void;
	disabled?: boolean;
};

export function DocumentLanguagePicker({
	value,
	onChange,
	disabled,
}: DocumentLanguagePickerProps) {
	return (
		<div
			role="radiogroup"
			aria-label="Document language"
			className="grid gap-2 sm:grid-cols-2"
		>
			{DOCUMENT_LANGUAGE_CODES.map((code) => {
				const meta = documentLanguageOptions.find((o) => o.value === code);
				const selected = value === code;
				return (
					<label
						key={code}
						className={cn(
							"flex cursor-pointer flex-col gap-1 border border-border p-4 text-left transition-colors",
							disabled && "cursor-not-allowed opacity-50",
							selected &&
								"border-foreground bg-muted/30 ring-1 ring-foreground",
							!selected && !disabled && "hover:bg-muted/40",
						)}
					>
						<input
							type="radio"
							name="document-language"
							value={code}
							checked={selected}
							disabled={disabled}
							onChange={() => onChange(code)}
							className="sr-only"
						/>
						<span className="font-medium text-sm leading-snug">
							{DOCUMENT_LANGUAGE_LABELS[code]}
						</span>
						{meta ? (
							<span className="text-muted-foreground text-xs leading-relaxed">
								{meta.description}
							</span>
						) : null}
					</label>
				);
			})}
		</div>
	);
}
