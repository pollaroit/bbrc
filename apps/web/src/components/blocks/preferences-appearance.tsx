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
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
	ChoiceGroup,
	OptionCard,
	PreferenceRow,
	PreferencesSection,
	Segmented,
} from "@/components/blocks/preferences-ui";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	updatePreference,
	usePreferences,
} from "@/lib/preferences/use-preferences";
import { cn } from "@/lib/utils";

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
	const t = useTranslations("preferences.appearance");
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
			label={t("paletteLabel", { name: palette.name })}
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
						{t(locked === "dark" ? "darkOnly" : "lightOnly")}
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
	const t = useTranslations("preferences.appearance");
	return (
		<PreferenceRow label={label} hint={hint}>
			<ChoiceGroup label={label} className="grid gap-2 sm:grid-cols-2">
				{ids.map((id) => {
					if (id === SAME_AS_BODY) {
						return (
							<OptionCard
								key={id}
								label={t("sameAsBodyLabel")}
								selected={value === id}
								onSelect={() => onChange(id)}
							>
								<span className="font-medium text-sm">{t("sameAsBody")}</span>
								<span className="text-muted-foreground text-xs">
									{t("followsBody")}
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
								{t(`fontNotes.${id as FontId}`)}
								{option.cyrillic ? "" : ` · ${t("latinOnly")}`}
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
	const t = useTranslations("preferences.appearance");
	const f = useFormatters();
	return (
		<div className="flex flex-col gap-3 border border-border bg-card p-4">
			<p className="text-muted-foreground text-xs">{t("livePreview")}</p>
			<h3 className="font-semibold text-xl tracking-tight">
				{t("previewTitle")}
			</h3>
			<p className="font-reading text-sm leading-relaxed">{t("previewText")}</p>
			<div className="flex flex-wrap items-center gap-2">
				<Button size="sm">{t("previewMarkRead")}</Button>
				<Button size="sm" variant="outline">
					{t("previewAddToShelf")}
				</Button>
				<span className="border border-success/30 bg-success/10 px-1.5 py-0.5 text-success-ink text-xs">
					{t("previewCompleted")}
				</span>
				<span className="border border-info/30 bg-info/10 px-1.5 py-0.5 text-info-ink text-xs">
					{t("previewReading")}
				</span>
				<span className="border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-warning-ink text-xs">
					{t("previewWishlist")}
				</span>
				<span className="border border-pink/30 bg-pink/10 px-1.5 py-0.5 text-pink-ink text-xs">
					{t("previewLiked")}
				</span>
			</div>
			<p className="text-muted-foreground text-xs">
				{t("previewMuted", { rating: f.rating(4.5), pages: 354, reads: 12 })}
			</p>
		</div>
	);
}

export function PreferencesAppearance() {
	const t = useTranslations("preferences.appearance");
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
			title={t("title")}
			description={t("description")}
		>
			<PreferenceRow
				label={t("mode")}
				hint={
					locked
						? t("modeLocked", {
								palette: appearance.palette,
								mode: t(locked === "dark" ? "modeDark" : "modeLight"),
							})
						: t("modeHint")
				}
			>
				<Segmented
					label={t("mode")}
					value={locked ?? appearance.mode}
					disabled={locked != null}
					options={COLOR_MODES.map((id) => ({
						id,
						label: t(
							id === "system"
								? "modeSystem"
								: id === "light"
									? "modeLight"
									: "modeDark",
						),
					}))}
					onChange={(mode) => updatePreference("appearance", "mode", mode)}
				/>
			</PreferenceRow>

			<PreferenceRow label={t("palette")} hint={t("paletteHint")}>
				<Input
					type="search"
					value={paletteQuery}
					onChange={(event) => setPaletteQuery(event.target.value)}
					placeholder={t("searchPalettes")}
					aria-label={t("searchPalettesLabel")}
					className="max-w-xs"
				/>
				<ChoiceGroup
					label={t("palette")}
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
						{t("noPaletteMatches", { query: paletteQuery })}
					</p>
				) : null}
				<p className="text-muted-foreground text-xs">
					{t.rich("paletteCredit", {
						link: (chunks) => (
							<a
								href="https://tweakcn.com"
								target="_blank"
								rel="noreferrer"
								className="underline"
							>
								{chunks}
							</a>
						),
					})}
				</p>
			</PreferenceRow>

			<FontPicker
				label={t("bodyFont")}
				hint={t("bodyFontHint")}
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
				label={t("headingFont")}
				hint={t("headingFontHint")}
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
				label={t("readingFont")}
				hint={t("readingFontHint")}
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

			<PreferenceRow label={t("textSize")} hint={t("textSizeHint")}>
				<Segmented
					label={t("textSize")}
					value={appearance.textSize}
					options={TEXT_SIZES.map((option) => ({
						id: option.id,
						label: t(`textSizes.${option.id}`),
					}))}
					onChange={(size) => updatePreference("appearance", "textSize", size)}
				/>
			</PreferenceRow>
			<PreferenceRow label={t("lineSpacing")} hint={t("lineSpacingHint")}>
				<Segmented
					label={t("lineSpacing")}
					value={appearance.lineSpacing}
					options={LINE_SPACINGS.map((option) => ({
						id: option.id,
						label: t(`lineSpacings.${option.id}`),
					}))}
					onChange={(spacing) =>
						updatePreference("appearance", "lineSpacing", spacing)
					}
				/>
			</PreferenceRow>

			<PreferenceRow label={t("corners")} hint={t("cornersHint")}>
				<ChoiceGroup
					label={t("corners")}
					className="grid grid-cols-3 gap-2 sm:grid-cols-6"
				>
					{RADIUS_OPTIONS.map((option) => (
						<OptionCard
							key={option.id}
							label={t("cornersOption", { size: t(`radii.${option.id}`) })}
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
							<span className="font-medium text-sm">
								{t(`radii.${option.id}`)}
							</span>
						</OptionCard>
					))}
				</ChoiceGroup>
			</PreferenceRow>

			<AppearancePreview />
		</PreferencesSection>
	);
}
