"use client";

import { calculateWpm, countWords } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useEffect, useRef, useState } from "react";
import { type WpmLanguage, wpmLanguages, wpmTexts } from "@/lib/wpm-texts";

type Phase = "idle" | "running" | "done";

type ProfileWpmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApply: (wpm: number) => void;
};

function formatElapsed(ms: number) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ProfileWpmDialog({
	open,
	onOpenChange,
	onApply,
}: ProfileWpmDialogProps) {
	const [language, setLanguage] = useState<WpmLanguage>("en");
	const [phase, setPhase] = useState<Phase>("idle");
	const [elapsedMs, setElapsedMs] = useState(0);
	const [resultWpm, setResultWpm] = useState<number | null>(null);
	const startedAtRef = useRef(0);

	const text = wpmTexts[language];

	useEffect(() => {
		if (!open) {
			setPhase("idle");
			setElapsedMs(0);
			setResultWpm(null);
		}
	}, [open]);

	useEffect(() => {
		if (phase !== "running") return;
		const interval = window.setInterval(() => {
			setElapsedMs(performance.now() - startedAtRef.current);
		}, 200);
		return () => window.clearInterval(interval);
	}, [phase]);

	function start() {
		startedAtRef.current = performance.now();
		setElapsedMs(0);
		setPhase("running");
	}

	function finish() {
		const elapsed = performance.now() - startedAtRef.current;
		setElapsedMs(elapsed);
		setResultWpm(calculateWpm(countWords(text), elapsed));
		setPhase("done");
	}

	function reset() {
		setPhase("idle");
		setElapsedMs(0);
		setResultWpm(null);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<div className="flex items-start justify-between gap-4 pr-8">
						<DialogTitle>Measure your reading speed</DialogTitle>
						<Select
							value={language}
							disabled={phase === "running"}
							onValueChange={(value) => {
								setLanguage(value as WpmLanguage);
								reset();
							}}
						>
							<SelectTrigger className="w-36" aria-label="Text language">
								<SelectValue>
									{wpmLanguages.find((item) => item.code === language)?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{wpmLanguages.map((item) => (
									<SelectItem key={item.code} value={item.code}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogDescription>
						Pick a language, start the timer, then read the passage at your
						normal pace. Press Finished when you reach the end.
					</DialogDescription>
				</DialogHeader>

				{phase === "idle" ? (
					<p className="border border-border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
						The text appears when you start the timer.
					</p>
				) : null}

				{phase === "running" ? (
					<div className="flex flex-col gap-3">
						<p
							className="font-medium text-sm tabular-nums"
							role="timer"
							aria-live="off"
						>
							{formatElapsed(elapsedMs)}
						</p>
						<p
							lang={language}
							className="max-h-72 overflow-y-auto border border-border px-4 py-3 text-sm leading-relaxed"
						>
							{text}
						</p>
					</div>
				) : null}

				{phase === "done" && resultWpm !== null ? (
					<div className="flex flex-col gap-1 border border-border px-4 py-6 text-center">
						<p className="font-semibold text-4xl tabular-nums">{resultWpm}</p>
						<p className="text-muted-foreground text-sm">
							words per minute · {countWords(text)} words in{" "}
							{formatElapsed(elapsedMs)}
						</p>
					</div>
				) : null}

				<DialogFooter>
					{phase === "idle" ? (
						<Button type="button" onClick={start}>
							Start timer
						</Button>
					) : null}
					{phase === "running" ? (
						<Button type="button" onClick={finish}>
							Finished
						</Button>
					) : null}
					{phase === "done" && resultWpm !== null ? (
						<>
							<Button type="button" variant="outline" onClick={reset}>
								Try again
							</Button>
							<Button
								type="button"
								onClick={() => {
									onApply(resultWpm);
									onOpenChange(false);
								}}
							>
								Use {resultWpm} WPM
							</Button>
						</>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
