"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Pause,
	Play,
	SkipForward,
	Square,
	Volume2,
	VolumeX,
} from "lucide-react";
import type { ReactNode } from "react";

function DockButton({
	icon,
	label,
	onClick,
	pressed,
	className,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	pressed?: boolean;
	className?: string;
}) {
	return (
		<Button
			type="button"
			variant="outline"
			className={`h-16 flex-col gap-1.5 text-xs ${className ?? ""}`}
			aria-pressed={pressed}
			onClick={onClick}
		>
			{icon}
			{label}
		</Button>
	);
}

/**
 * The controls, in reach of a thumb: one big button for the main thing (pause,
 * resume or keep reading), and two beneath it.
 */
export function Dock({
	status,
	canKeepReading,
	isBreak,
	soundsPlaying,
	soundsOpen,
	showSoundsButton,
	onPause,
	onResume,
	onKeepReading,
	onFinishSession,
	onSkipBreak,
	onToggleSounds,
}: {
	status: "running" | "paused" | "done" | "idle";
	canKeepReading: boolean;
	isBreak: boolean;
	soundsPlaying: boolean;
	soundsOpen: boolean;
	showSoundsButton: boolean;
	onPause: () => void;
	onResume: () => void;
	onKeepReading: () => void;
	onFinishSession: () => void;
	onSkipBreak: () => void;
	onToggleSounds: () => void;
}) {
	const main =
		status === "done" ? (
			canKeepReading ? (
				<Button
					type="button"
					className="h-16 w-full text-base"
					onClick={onKeepReading}
				>
					<Play data-icon="inline-start" aria-hidden />
					Keep reading
				</Button>
			) : (
				<Button
					type="button"
					className="h-16 w-full text-base"
					onClick={onFinishSession}
				>
					<Square data-icon="inline-start" aria-hidden />
					Finish session
				</Button>
			)
		) : status === "paused" ? (
			<Button
				type="button"
				className="h-16 w-full text-base"
				onClick={onResume}
			>
				<Play data-icon="inline-start" aria-hidden />
				Resume
			</Button>
		) : (
			<Button
				type="button"
				variant="outline"
				className="h-16 w-full border-2 text-base"
				onClick={onPause}
			>
				<Pause data-icon="inline-start" aria-hidden />
				Pause
			</Button>
		);

	return (
		<div
			className="flex flex-col gap-2 border-border border-t bg-background px-4 pt-3"
			style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
		>
			{main}
			<div className="grid grid-cols-2 gap-2">
				{showSoundsButton ? (
					<DockButton
						icon={
							soundsPlaying ? (
								<Volume2 className="size-5" aria-hidden />
							) : (
								<VolumeX className="size-5 text-muted-foreground" aria-hidden />
							)
						}
						label={soundsOpen ? "Hide sounds" : "Sounds"}
						pressed={soundsOpen}
						onClick={onToggleSounds}
					/>
				) : null}
				{isBreak ? (
					<DockButton
						icon={<SkipForward className="size-5" aria-hidden />}
						label="Skip break"
						onClick={onSkipBreak}
						className={showSoundsButton ? "" : "col-span-2"}
					/>
				) : status === "done" ? null : (
					<DockButton
						icon={<Square className="size-5" aria-hidden />}
						label="Finish session"
						onClick={onFinishSession}
						className={showSoundsButton ? "" : "col-span-2"}
					/>
				)}
			</div>
		</div>
	);
}
