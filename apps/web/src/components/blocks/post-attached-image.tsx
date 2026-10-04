import { cn } from "@/lib/utils";

type PostAttachedImageProps = {
	src: string;
	alt: string;
	className?: string;
	priority?: boolean;
	compact?: boolean;
	/** Span the full content column (counteract card/form horizontal padding). */
	edgeToEdge?: boolean;
};

export function PostAttachedImage({
	src,
	alt,
	className,
	priority,
	compact,
	edgeToEdge,
}: PostAttachedImageProps) {
	const maxHeightClass = compact ? "max-h-64" : "max-h-[min(85vh,720px)]";

	return (
		<div
			className={cn(
				"flex w-full min-w-0 justify-center border border-border bg-muted/20",
				edgeToEdge &&
					"-mx-(--card-spacing) w-[calc(100%+var(--card-spacing)*2)] max-w-none border-x-0",
				!edgeToEdge && "overflow-hidden",
				className,
			)}
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={src}
				alt={alt}
				className={cn(
					"mx-auto block h-auto max-w-full object-contain object-center",
					maxHeightClass,
				)}
				loading={priority ? "eager" : "lazy"}
				decoding="async"
			/>
		</div>
	);
}
