"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type QrCodeProps = {
	/** What the code opens, usually a full link. */
	value: string;
	/** Width and height in pixels. */
	size?: number;
	/** File name (without extension) offered when downloading. */
	downloadName?: string;
	className?: string;
};

/**
 * A QR code made in the browser, black on white so any phone camera reads it
 * in both light and dark themes, with a button to save it as an image.
 */
export function QrCode({
	value,
	size = 192,
	downloadName = "qr-code",
	className,
}: QrCodeProps) {
	const [dataUrl, setDataUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		QRCode.toDataURL(value, {
			width: size * 2,
			margin: 2,
			errorCorrectionLevel: "M",
			color: { dark: "#000000", light: "#ffffff" },
		})
			.then((url) => {
				if (!cancelled) setDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setDataUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [value, size]);

	return (
		<div className={cn("flex flex-col items-start gap-2", className)}>
			{dataUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={dataUrl}
					alt="QR code that opens the invitation link"
					width={size}
					height={size}
					className="border border-border"
				/>
			) : (
				<Skeleton style={{ width: size, height: size }} aria-hidden />
			)}
			{dataUrl ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					render={<a href={dataUrl} download={`${downloadName}.png`} />}
					nativeButton={false}
				>
					<Download data-icon="inline-start" aria-hidden />
					Save image
				</Button>
			) : null}
		</div>
	);
}
