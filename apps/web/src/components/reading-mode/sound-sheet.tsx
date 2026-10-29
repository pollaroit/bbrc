"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Slider } from "@bbrc/ui/components/slider";
import { Pause, Play, VolumeX } from "lucide-react";
import type { Sounds } from "@/components/reading-mode/use-sounds";
import { cn } from "@/lib/utils";

/** The sound controls: rain, fireplace and so on, each with a volume, and the music list. */
export function SoundSheet({
	open,
	onOpenChange,
	sounds,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sounds: Sounds;
}) {
	const lofi = sounds.stations.filter((entry) => entry.group === "lofi");
	const classical = sounds.stations.filter(
		(entry) => entry.group === "classical",
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[85dvh] gap-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
			>
				<SheetHeader>
					<SheetTitle className="text-base">Sounds</SheetTitle>
					<SheetDescription>
						Mix as many as you like. Nothing plays until you tap it.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 px-4 pb-4">
					<section className="flex flex-col gap-3" aria-label="Ambient sounds">
						<h3 className="font-medium text-sm">Ambience</h3>
						<ul className="flex flex-col gap-3">
							{sounds.sounds.map((sound) => {
								const isOn = sounds.on[sound.id] === true;
								return (
									<li key={sound.id} className="flex items-center gap-3">
										<Button
											type="button"
											variant={isOn ? "default" : "outline"}
											className="h-11 w-32 justify-start"
											aria-pressed={isOn}
											onClick={() => void sounds.toggle(sound.id)}
										>
											{isOn ? (
												<Pause data-icon="inline-start" aria-hidden />
											) : (
												<Play data-icon="inline-start" aria-hidden />
											)}
											{sound.label}
										</Button>
										<Slider
											value={sounds.volumes[sound.id] ?? 50}
											min={0}
											max={100}
											step={1}
											disabled={!isOn}
											onValueChange={(value) =>
												sounds.setVolume(
													sound.id,
													Array.isArray(value) ? (value[0] ?? 0) : value,
												)
											}
											aria-label={`${sound.label} volume`}
											className="flex-1"
										/>
									</li>
								);
							})}
						</ul>
					</section>

					{sounds.stations.length > 0 ? (
						<section className="flex flex-col gap-3" aria-label="Music">
							<div className="flex items-center justify-between gap-2">
								<h3 className="font-medium text-sm">Music</h3>
								{sounds.station ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => void sounds.chooseStation(null)}
									>
										<VolumeX data-icon="inline-start" aria-hidden />
										Stop
									</Button>
								) : null}
							</div>
							{[
								{ title: "Lofi", items: lofi },
								{ title: "Classical", items: classical },
							].map((group) =>
								group.items.length === 0 ? null : (
									<div key={group.title} className="flex flex-col gap-1.5">
										<p className="text-muted-foreground text-xs">
											{group.title}
										</p>
										<div className="flex flex-wrap gap-1.5">
											{group.items.map((entry) => (
												<Button
													key={entry.id}
													type="button"
													variant={
														sounds.station?.id === entry.id
															? "default"
															: "outline"
													}
													className={cn("h-10 px-3")}
													aria-pressed={sounds.station?.id === entry.id}
													onClick={() => void sounds.chooseStation(entry.id)}
												>
													{entry.label}
												</Button>
											))}
										</div>
									</div>
								),
							)}
							{sounds.station ? (
								<div className="flex items-center gap-3">
									<span className="w-32 text-muted-foreground text-sm">
										Music volume
									</span>
									<Slider
										value={sounds.musicVolume}
										min={0}
										max={100}
										step={1}
										onValueChange={(value) =>
											sounds.setMusicVolume(
												Array.isArray(value) ? (value[0] ?? 0) : value,
											)
										}
										aria-label="Music volume"
										className="flex-1"
									/>
								</div>
							) : null}
							<p className="text-muted-foreground text-xs">
								Music comes from YouTube and pauses when your phone locks.
								Ambient sounds carry on while the app is open.
							</p>
						</section>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
