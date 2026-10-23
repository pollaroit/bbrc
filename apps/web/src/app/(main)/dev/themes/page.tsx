import { PALETTES, type PaletteMode } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Input } from "@bbrc/ui/components/input";
import { Progress } from "@bbrc/ui/components/progress";
import { Switch } from "@bbrc/ui/components/switch";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

const statusChips = [
	["Completed", "success"],
	["Reading", "info"],
	["Wishlist", "violet"],
	["Warned", "warning"],
	["Banned", "destructive"],
	["Liked", "pink"],
] as const;

const chipClass: Record<(typeof statusChips)[number][1], string> = {
	success: "border-success/30 bg-success/10 text-success-ink",
	info: "border-info/30 bg-info/10 text-info-ink",
	violet: "border-violet/30 bg-violet/10 text-violet-ink",
	warning: "border-warning/30 bg-warning/10 text-warning-ink",
	destructive: "border-destructive/30 bg-destructive/10 text-destructive-ink",
	pink: "border-pink/30 bg-pink/10 text-pink-ink",
};

/** A slice of real UI, rendered inside a wrapper that sets only the palette. */
function Sample({ paletteId, mode }: { paletteId: string; mode: PaletteMode }) {
	return (
		<div
			data-palette={paletteId}
			className={cn(
				"flex flex-col gap-3 border border-border bg-background p-4 text-foreground",
				mode === "dark" && "dark",
			)}
		>
			<p className="text-muted-foreground text-xs">
				{paletteId} · {mode}
			</p>
			<Card size="sm">
				<CardHeader>
					<CardTitle>Beloved</CardTitle>
					<CardDescription>Toni Morrison · 354 pages</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-wrap gap-2">
						<Button size="sm">Primary</Button>
						<Button size="sm" variant="secondary">
							Secondary
						</Button>
						<Button size="sm" variant="outline">
							Outline
						</Button>
						<Button size="sm" variant="ghost">
							Ghost
						</Button>
						<Button size="sm" variant="destructive">
							Delete
						</Button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{statusChips.map(([label, tone]) => (
							<span
								key={label}
								className={cn("border px-1.5 py-0.5 text-xs", chipClass[tone])}
							>
								{label}
							</span>
						))}
						<Badge variant="outline">Badge</Badge>
					</div>
					<Input placeholder="Search…" aria-label="Sample input" />
					<div className="flex items-center gap-3">
						<Switch aria-label="Sample switch" defaultChecked />
						<Progress value={62} className="flex-1" />
					</div>
					<p className="text-muted-foreground text-xs">
						Muted text and a{" "}
						<a href="#top" className="text-primary underline">
							jump to the top
						</a>
						.
					</p>
					<div className="flex h-8 items-end gap-1" aria-hidden>
						{[1, 2, 3, 4, 5].map((step) => (
							<span
								key={step}
								className="flex-1"
								style={{
									height: `${20 + step * 16}%`,
									background: `var(--chart-${step})`,
								}}
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function ThemesDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	return (
		<div className="flex flex-col gap-6" id="top">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Palettes</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Every palette in each mode it supports, on the same components. Use it
					to check a new palette by eye; contrast is also tested in{" "}
					<code>packages/shared/src/themes/palettes.test.ts</code>.
				</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{PALETTES.flatMap((palette) =>
					palette.modes.map((mode) => (
						<Sample
							key={`${palette.id}-${mode}`}
							paletteId={palette.id}
							mode={mode}
						/>
					)),
				)}
			</div>
		</div>
	);
}
