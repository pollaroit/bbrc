"use client";

import { genres } from "@bbrc/shared";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

type ProfileGenrePickerProps = {
	genreSlugs: string[];
	subgenreSlugs: string[];
	onChange: (value: { genres: string[]; subgenres: string[] }) => void;
	disabled?: boolean;
};

export function ProfileGenrePicker({
	genreSlugs,
	subgenreSlugs,
	onChange,
	disabled,
}: ProfileGenrePickerProps) {
	const selectedGenres = new Set(genreSlugs);
	const selectedSubgenres = new Set(subgenreSlugs);

	function toggleGenre(slug: string) {
		if (selectedGenres.has(slug)) {
			const genre = genres.find((item) => item.slug === slug);
			const childSlugs = new Set<string>(
				(genre?.subgenres ?? []).map((sub) => sub.slug),
			);
			onChange({
				genres: genreSlugs.filter((item) => item !== slug),
				subgenres: subgenreSlugs.filter((item) => !childSlugs.has(item)),
			});
			return;
		}
		onChange({ genres: [...genreSlugs, slug], subgenres: subgenreSlugs });
	}

	function toggleSubgenre(slug: string) {
		onChange({
			genres: genreSlugs,
			subgenres: selectedSubgenres.has(slug)
				? subgenreSlugs.filter((item) => item !== slug)
				: [...subgenreSlugs, slug],
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{genres.map((genre) => {
				const active = selectedGenres.has(genre.slug);
				return (
					<Fragment key={genre.slug}>
						<button
							type="button"
							aria-pressed={active}
							disabled={disabled}
							title={genre.description}
							onClick={() => toggleGenre(genre.slug)}
							className={cn(
								"border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 disabled:opacity-50",
								active
									? "border-pink-600 bg-pink-500 text-white hover:bg-pink-600"
									: "border-border hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40",
							)}
						>
							{genre.name}
						</button>
						{active
							? genre.subgenres?.map((sub) => {
									const subActive = selectedSubgenres.has(sub.slug);
									return (
										<button
											key={sub.slug}
											type="button"
											aria-pressed={subActive}
											disabled={disabled}
											onClick={() => toggleSubgenre(sub.slug)}
											className={cn(
												"border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 disabled:opacity-50",
												subActive
													? "border-pink-500 bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-100"
													: "border-pink-300 border-dashed text-pink-800 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-200 dark:hover:bg-pink-950/40",
											)}
										>
											{sub.name}
										</button>
									);
								})
							: null}
					</Fragment>
				);
			})}
		</div>
	);
}
