"use client";

import { isValidIsbn13, normalizeIsbn } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { ScanBarcode } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * "Scan ISBN" for phones and laptops with a camera.
 *
 * Uses the browser's BarcodeDetector, so the button only appears where that
 * exists (Chrome and Edge on Android and desktop). Books carry their ISBN-13 as
 * an EAN-13 barcode starting 978 or 979. Everything else just does not show.
 *
 * <IsbnScannerButton onDetected={(isbn) => …} disabled? />
 *   onDetected  called once with the digits of a valid ISBN-13
 */

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = {
	detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = {
	new (options?: { formats?: string[] }): BarcodeDetectorInstance;
	getSupportedFormats?: () => Promise<string[]>;
};

function getDetectorConstructor(): BarcodeDetectorConstructor | null {
	const candidate = (
		window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
	).BarcodeDetector;
	return candidate ?? null;
}

export function IsbnScannerButton({
	onDetected,
	disabled = false,
}: {
	onDetected: (isbn: string) => void;
	disabled?: boolean;
}) {
	const [supported, setSupported] = useState(false);
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const Detector = getDetectorConstructor();
		if (!Detector || !navigator.mediaDevices?.getUserMedia) return;
		const check =
			Detector.getSupportedFormats?.() ?? Promise.resolve(["ean_13"]);
		check
			.then((formats) => {
				if (!cancelled && formats.includes("ean_13")) setSupported(true);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!supported) return null;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="icon"
				disabled={disabled}
				aria-label="Scan an ISBN barcode with the camera"
				title="Scan ISBN"
				onClick={() => {
					setError(null);
					setOpen(true);
				}}
			>
				<ScanBarcode aria-hidden />
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="gap-4 sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Scan the barcode</DialogTitle>
						<DialogDescription>
							Hold the barcode on the back of the book inside the frame.
						</DialogDescription>
					</DialogHeader>
					{open ? (
						<ScannerView
							error={error}
							onError={setError}
							onDetected={(isbn) => {
								setOpen(false);
								onDetected(isbn);
							}}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}

function ScannerView({
	error,
	onError,
	onDetected,
}: {
	error: string | null;
	onError: (message: string | null) => void;
	onDetected: (isbn: string) => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const onDetectedRef = useRef(onDetected);
	onDetectedRef.current = onDetected;
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	const stop = useCallback((stream: MediaStream | null) => {
		for (const track of stream?.getTracks() ?? []) track.stop();
	}, []);

	useEffect(() => {
		let stream: MediaStream | null = null;
		let timer: ReturnType<typeof setInterval> | null = null;
		let cancelled = false;

		async function start() {
			const Detector = getDetectorConstructor();
			if (!Detector) return;
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: "environment" } },
					audio: false,
				});
			} catch (reason) {
				const denied =
					reason instanceof DOMException &&
					(reason.name === "NotAllowedError" ||
						reason.name === "SecurityError");
				onErrorRef.current(
					denied
						? "Camera access was blocked. Allow the camera in your browser settings, or type the ISBN instead."
						: "No camera could be started. Type the ISBN instead.",
				);
				return;
			}
			if (cancelled) {
				stop(stream);
				return;
			}
			const video = videoRef.current;
			if (!video) return;
			video.srcObject = stream;
			await video.play().catch(() => {});

			const detector = new Detector({ formats: ["ean_13"] });
			let busy = false;
			timer = setInterval(async () => {
				if (busy || video.readyState < 2) return;
				busy = true;
				try {
					const codes = await detector.detect(video);
					const isbn = codes
						.map((code) => normalizeIsbn(code.rawValue))
						.find((value) => isValidIsbn13(value) && /^97[89]/.test(value));
					if (isbn && !cancelled) {
						cancelled = true;
						onDetectedRef.current(isbn);
					}
				} catch {
					// A frame that cannot be read is skipped.
				} finally {
					busy = false;
				}
			}, 250);
		}

		void start();
		return () => {
			cancelled = true;
			if (timer) clearInterval(timer);
			stop(stream);
		};
	}, [stop]);

	return error ? (
		<p className="border border-destructive/40 bg-destructive/5 p-3 text-destructive-ink text-sm">
			{error}
		</p>
	) : (
		<div className="relative aspect-4/3 overflow-hidden bg-muted">
			<video
				ref={videoRef}
				className="size-full object-cover"
				muted
				playsInline
				aria-label="Camera preview"
			/>
			<div
				className="pointer-events-none absolute inset-x-[12%] top-[34%] bottom-[34%] border-2 border-background shadow-[0_0_0_9999px] shadow-foreground/30"
				aria-hidden
			/>
		</div>
	);
}
