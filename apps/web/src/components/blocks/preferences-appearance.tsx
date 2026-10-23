"use client";

import {
	BODY_FONT_IDS,
	COLOR_MODES,
	FONT_OPTIONS,
	type FontId,
	type FontOption,
	fontFamilyFor,
	HEADING_FONT_IDS,
	LINE_SPACINGS,
	lockedModeFor,
	PALETTES,
	paletteTokens,
	RADIUS_OPTIONS,
	READING_FONT_IDS,
	SAME_AS_BODY,
	TEXT_SIZES,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
	ChoiceGroup,
	OptionCard,
	PreferenceRow,
	PreferencesSection,
	Segmented,
} from "@/components/blocks/preferences-ui";
import {
	updatePreference,
	usePreferences,
} from "@/lib/preferences/use-preferences";
import { cn } from "@/lib/utils";

const modeLabels = { system: "System", light: "Light", dark: "Dark" } as const;

function useResolvedMode(): "light" | "dark" {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted && resolvedTheme === "dark" ? "dark" : "light";
}

function PaletteCard({
	paletteId,
	selected,
	mode,
}: {
	paletteId: string;
	selected: boolean;
	mode: "light" | "dark";
}) {
	const palette = PALETTES.find((item) => item.id === paletteId);
	if (!palette) {
		return null;
	}
	const locked = lockedModeFor(palette.id);
	const shownMode = locked ?? mode;
	const tone = shownMode === "dark" ? palette.dark : palette.light;
	const dots = tone
		? Object.keys(paletteTokens(tone, shownMode)).filter((name) =>
				["primary", "accent", "success", "info", "warning", "pink"].includes(
					name,
				),
			)
		: [];

	return (
		<OptionCard
			label={`${palette.name} palette`}
			selected={selected}
			onSelect={() => updatePreference("appearance", "palette", palette.id)}
		>
			<div
				data-palette={palette.id}
				className={cn(
					"flex flex-col gap-2 border border-border bg-background p-3 text-foreground",
					shownMode === "dark" && "dark",
				)}
			>
				<span className="font-semibold text-base leading-none">Aa</span>
				<span className="h-1.5 w-3/4 bg-muted-foreground/40" aria-hidden />
				<span className="h-1.5 w-1/2 bg-muted-foreground/25" aria-hidden />
				<span className="mt-1 flex gap-1" aria-hidden>
					{dots.map((name) => (
						<span
							key={name}
							className="size-3.5 border border-border"
							style={{ background: `var(--${name})` }}
						/>
					))}
				</span>
			</div>
			<span className="flex items-center justify-between gap-2">
				<span className="font-medium text-sm">{palette.name}</span>
				{locked ? (
					<Badge variant="outline" className="font-normal text-3xs">
						{locked} only
					</Badge>
				) : null}
			</span>
			{palette.description ? (
				<span className="text-muted-foreground text-xs leading-snug">
					{palette.description}
				</span>
			) : null}
		</OptionCard>
	);
}

function FontPicker({
	label,
	hint,
	value,
	ids,
	onChange,
}: {
	label: string;
	hint: string;
	value: string;
	ids: readonly string[];
	onChange: (id: string) => void;
}) {
	return (
		<PreferenceRow label={label} hint={hint}>
			<ChoiceGroup label={label} className="grid gap-2 sm:grid-cols-2">
				{ids.map((id) => {
					if (id === SAME_AS_BODY) {
						return (
							<OptionCard
								key={id}
								label="Same as body font"
								selected={value === id}
								onSelect={() => onChange(id)}
							>
								<span className="font-medium text-sm">Same as body</span>
								<span className="text-muted-foreground text-xs">
									Follows your body font
								</span>
							</OptionCard>
						);
					}
					const option = FONT_OPTIONS[id as FontId] as FontOption;
					return (
						<OptionCard
							key={id}
							label={option.label}
							selected={value === id}
							onSelect={() => onChange(id)}
						>
							<span
								className="text-base leading-tight"
								style={{ fontFamily: fontFamilyFor(id as FontId) }}
							>
								{option.label}
							</span>
							<span className="text-muted-foreground text-xs">
								{option.note}
								{option.cyrillic ? "" : " · Latin only"}
							</span>
						</OptionCard>
					);
				})}
			</ChoiceGroup>
		</PreferenceRow>
	);
}

/** Sample of the club's own content, so changes are visible right away. */
function AppearancePreview() {
	return (
		<div className="flex flex-col gap-3 border border-border bg-card p-4">
			<p className="text-muted-foreground text-xs">Live preview</p>
			<h3 className="font-semibold text-xl tracking-tight">
				Beloved, by Toni Morrison
			</h3>
			<p className="font-reading text-sm leading-relaxed">
				“Definitions belonged to the definers, not the defined.” A story about
				memory, freedom and what we carry. Tap a palette or font above and this
				card changes with you.
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<Button size="sm">Mark as read</Button>
				<Button size="sm" variant="outline">
					Add to shelf
				</Button>
				<span className="border border-success/30 bg-success/10 px-1.5 py-0.5 text-success-ink text-xs">
					Completed
				</span>
				<span className="border border-info/30 bg-info/10 px-1.5 py-0.5 text-info-ink text-xs">
					Reading
				</span>
				<span className="border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-warning-ink text-xs">
					Wishlist
				</span>
				<span className="border border-pink/30 bg-pink/10 px-1.5 py-0.5 text-pink-ink text-xs">
					Liked
				</span>
			</div>
			<p className="text-muted-foreground text-xs">
				Muted text looks like this. 4.5 out of 5 stars · 354 pages · 12 reads.
			</p>
		</div>
	);
}

export function PreferencesAppearance() {
	const { appearance } = usePreferences();
	const resolved = useResolvedMode();
	const locked = lockedModeFor(appearance.palette);
	const [paletteQuery, setPaletteQuery] = useState("");
	const needle = paletteQuery.trim().toLowerCase();
	const visiblePalettes = PALETTES.filter(
		(palette) =>
			palette.id === appearance.palette ||
			needle === "" ||
			palette.name.toLowerCase().includes(needle),
	);

	return (
		<PreferencesSection
			id="appearance"
			title="Appearance"
			description="Pick how the club looks. Changes apply instantly."
		>
			<PreferenceRow
				label="Mode"
				hint={
					locked
						? `The ${appearance.palette} palette only works in ${locked} mode. Pick another palette to choose.`
						: "Follow your device, or always use light or dark."
				}
			>
				<Segmented
					label="Mode"
					value={locked ?? appearance.mode}
					disabled={locked != null}
					options={COLOR_MODES.map((id) => ({ id, label: modeLabels[id] }))}
					onChange={(mode) => updatePreference("appearance", "mode", mode)}
				/>
			</PreferenceRow>

			<PreferenceRow
				label="Palette"
				hint="The colours used across the site. Most come in light and dark."
			>
				<Input
					type="search"
					value={paletteQuery}
					onChange={(event) => setPaletteQuery(event.target.value)}
					placeholder="Search palettes…"
					aria-label="Search palettes"
					className="max-w-xs"
				/>
				<ChoiceGroup
					label="Palette"
					className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
				>
					{visiblePalettes.map((palette) => (
						<PaletteCard
							key={palette.id}
							paletteId={palette.id}
							selected={appearance.palette === palette.id}
							mode={resolved}
						/>
					))}
				</ChoiceGroup>
				{visiblePalettes.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No palette matches “{paletteQuery}”.
					</p>
				) : null}
				<p className="text-muted-foreground text-xs">
					Most palettes are presets from{" "}
					<a
						href="https://tweakcn.com"
						target="_blank"
						rel="noreferrer"
						className="underline"
					>
						tweakcn
					</a>
					, lightly adjusted so text stays easy to read.
				</p>
			</PreferenceRow>

			<FontPicker
				label="Body font"
				hint="Used for most text. The default, Geist Mono, is the club's own look."
				value={appearance.fontBody}
				ids={BODY_FONT_IDS}
				onChange={(id) =>
					updatePreference(
						"appearance",
						"fontBody",
						id as (typeof BODY_FONT_IDS)[number],
					)
				}
			/>
			<FontPicker
				label="Heading font"
				hint="Titles and section headings."
				value={appearance.fontHeading}
				ids={HEADING_FONT_IDS}
				onChange={(id) =>
					updatePreference(
						"appearance",
						"fontHeading",
						id as (typeof HEADING_FONT_IDS)[number],
					)
				}
			/>
			<FontPicker
				label="Reading font"
				hint="Reviews, posts, comments and bios, where you read longer text."
				value={appearance.fontReading}
				ids={READING_FONT_IDS}
				onChange={(id) =>
					updatePreference(
						"appearance",
						"fontReading",
						id as (typeof READING_FONT_IDS)[number],
					)
				}
			/>

			<PreferenceRow
				label="Text size"
				hint="Makes text bigger or smaller everywhere. Layout stays put."
			>
				<Segmented
					label="Text size"
					value={appearance.textSize}
					options={TEXT_SIZES}
					onChange={(size) => updatePreference("appearance", "textSize", size)}
				/>
			</PreferenceRow>
			<PreferenceRow
				label="Line spacing"
				hint="More space between lines can make long text easier to follow."
			>
				<Segmented
					label="Line spacing"
					value={appearance.lineSpacing}
					options={LINE_SPACINGS}
					onChange={(spacing) =>
						updatePreference("appearance", "lineSpacing", spacing)
					}
				/>
			</PreferenceRow>

			<PreferenceRow
				label="Corners"
				hint="How round boxes, buttons and inputs are. None is the club's sharp look."
			>
				<ChoiceGroup
					label="Corners"
					className="grid grid-cols-3 gap-2 sm:grid-cols-6"
				>
					{RADIUS_OPTIONS.map((option) => (
						<OptionCard
							key={option.id}
							label={`${option.label} corners`}
							selected={appearance.radius === option.id}
							onSelect={() =>
								updatePreference("appearance", "radius", option.id)
							}
						>
							{/* SVG, because the radius preference squares every CSS box. */}
							<svg
								viewBox="0 0 32 32"
								className="size-8 text-foreground"
								aria-hidden
							>
								<rect
									x="2"
									y="2"
									width="28"
									height="28"
									rx={Number.parseFloat(option.value) * 16}
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								/>
							</svg>
							<span className="font-medium text-sm">{option.label}</span>
						</OptionCard>
					))}
				</ChoiceGroup>
			</PreferenceRow>

			<AppearancePreview />
		</PreferencesSection>
	);
}
