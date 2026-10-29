"use client";

import { Button } from "@bbrc/ui/components/button";
import { Slider } from "@bbrc/ui/components/slider";
import {
	CloudRain,
	Coffee,
	Flame,
	Loader2,
	Music2,
	Play,
	TreePine,
	Volume2,
	VolumeX,
	Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { Sounds } from "@/components/reading-mode/use-sounds";
import { loadYouTubeApi } from "@/lib/reading-mode/youtube";
import { cn } from "@/lib/utils";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
	rain: CloudRain,
	fire: Flame,
	wind: Wind,
	cafe: Coffee,
	forest: TreePine,
};

/** Three little bars that dance while music plays (still when motion is reduced). */
function PlayingBars() {
	return (
		<span className="flex h-4 items-end gap-0.5" aria-hidden>
			{[0, 1, 2].map((bar) => (
				<span
					key={bar}
					className="w-1 origin-bottom animate-pulse bg-primary motion-reduce:animate-none"
					style={{
						height: `${[60, 100, 75][bar]}%`,
						animationDelay: `${bar * 180}ms`,
					}}
				/>
			))}
		</span>
	);
}

function VolumeSlider({
	value,
	onChange,
	label,
	disabled,
}: {
	value: number;
	onChange: (value: number) => void;
	label: string;
	disabled?: boolean;
}) {
	return (
		<Slider
			value={value}
			min={0}
			max={100}
			step={1}
			disabled={disabled}
			onValueChange={(next) =>
				onChange(Array.isArray(next) ? (next[0] ?? 0) : next)
			}
			aria-label={label}
			className="w-full"
		/>
	);
}

/**
 * The sounds: ambience you can mix (each with its own volume), and one music
 * station. Station buttons show loading until the music is really playing.
 */
export function SoundsPanel({
	sounds,
	className,
}: {
	sounds: Sounds;
	className?: string;
}) {
	const [group, setGroup] = useState<"lofi" | "classical">("lofi");
	const lofi = sounds.stations.filter((entry) => entry.group === "lofi");
	const classical = sounds.stations.filter(
		(entry) => entry.group === "classical",
	);
	const list = group === "lofi" ? lofi : classical;

	// Start loading YouTube's player now, so choosing a station is quicker.
	useEffect(() => {
		if (sounds.stations.length > 0)
			void loadYouTubeApi().catch(() => undefined);
	}, [sounds.stations.length]);

	return (
		<section
			aria-label="Sounds"
			className={cn(
				"flex flex-col gap-5 border border-border bg-card p-4",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<h2 className="flex items-center gap-2 font-medium text-sm">
					<Volume2 className="size-4 text-muted-foreground" aria-hidden />
					Sounds
				</h2>
				{sounds.anyPlaying ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={sounds.stopAll}
					>
						<VolumeX data-icon="inline-start" aria-hidden />
						Stop all
					</Button>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-xs">
					Mix as many as you like. Nothing plays until you tap it.
				</p>
				<ul className="grid grid-cols-2 gap-2">
					{sounds.sounds.map((sound) => {
						const Icon = ICONS[sound.id] ?? Volume2;
						const isOn = sounds.on[sound.id] === true;
						const starting = sounds.starting[sound.id] === true;
						return (
							<li
								key={sound.id}
								className={cn(
									"flex flex-col gap-3 border p-3 transition-colors",
									isOn ? "border-primary/50 bg-primary/5" : "border-border",
								)}
							>
								<button
									type="button"
									aria-pressed={isOn}
									disabled={starting}
									onClick={() => void sounds.toggle(sound.id)}
									className="flex items-center gap-2.5 text-start focus-visible:outline-2 focus-visible:outline-ring"
								>
									<span
										className={cn(
											"grid size-9 shrink-0 place-items-center transition-colors",
											isOn
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground",
										)}
									>
										{starting ? (
											<Loader2
												className="size-4 animate-spin motion-reduce:animate-none"
												aria-hidden
											/>
										) : (
											<Icon className="size-4" />
										)}
									</span>
									<span className="flex min-w-0 flex-col">
										<span className="font-medium text-sm">{sound.label}</span>
										<span className="text-muted-foreground text-xs">
											{starting ? "Starting…" : isOn ? "Playing" : "Off"}
										</span>
									</span>
								</button>
								<VolumeSlider
									value={sounds.volumes[sound.id] ?? 50}
									onChange={(value) => sounds.setVolume(sound.id, value)}
									label={`${sound.label} volume`}
									disabled={!isOn}
								/>
							</li>
						);
					})}
				</ul>
			</div>

			{sounds.stations.length > 0 ? (
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2">
						<h3 className="flex items-center gap-2 font-medium text-sm">
							<Music2 className="size-4 text-muted-foreground" aria-hidden />
							Music
						</h3>
						<fieldset className="m-0 grid min-w-0 grid-cols-2 border border-border p-0">
							<legend className="sr-only">Kind of music</legend>
							{(
								[
									["lofi", "Lofi"],
									["classical", "Classical"],
								] as const
							).map(([id, label]) => (
								<button
									key={id}
									type="button"
									aria-pressed={group === id}
									onClick={() => setGroup(id)}
									className={cn(
										"h-8 px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
										group === id
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted/50",
									)}
								>
									{label}
								</button>
							))}
						</fieldset>
					</div>

					<ul className="flex flex-col gap-1.5">
						{list.map((entry) => {
							const active = sounds.station?.id === entry.id;
							const loading = active && sounds.musicStatus === "loading";
							const playing = active && sounds.musicStatus === "playing";
							return (
								<li key={entry.id}>
									<button
										type="button"
										aria-pressed={active}
										onClick={() =>
											void sounds.chooseStation(active ? null : entry.id)
										}
										className={cn(
											"flex min-h-12 w-full items-center gap-3 border px-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring",
											active
												? "border-primary/50 bg-primary/5"
												: "border-border hover:bg-muted/40",
										)}
									>
										<span className="grid size-6 shrink-0 place-items-center">
											{loading ? (
												<Loader2
													className="size-4 animate-spin motion-reduce:animate-none"
													aria-hidden
												/>
											) : playing ? (
												<PlayingBars />
											) : (
												<Play
													className="size-4 text-muted-foreground"
													aria-hidden
												/>
											)}
										</span>
										<span className="min-w-0 flex-1 truncate text-sm">
											{entry.label}
										</span>
										{loading ? (
											<span className="text-muted-foreground text-xs">
												Loading…
											</span>
										) : null}
									</button>
								</li>
							);
						})}
					</ul>

					{sounds.station ? (
						<div className="flex items-center gap-3">
							<span className="w-24 shrink-0 text-muted-foreground text-xs">
								Music volume
							</span>
							<VolumeSlider
								value={sounds.musicVolume}
								onChange={sounds.setMusicVolume}
								label="Music volume"
							/>
						</div>
					) : null}
					<p className="text-muted-foreground text-xs">
						Music comes from YouTube and pauses when your phone locks. Ambience
						keeps going while the app is open.
					</p>
				</div>
			) : null}
		</section>
	);
}
