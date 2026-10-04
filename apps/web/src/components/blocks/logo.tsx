import { cn } from "@bbrc/ui/lib/utils";
import Image from "next/image";

type LogoProps = {
	className?: string;
	/** Accessible label when the logo is not paired with visible site text. */
	label?: string;
};

export function Logo({ className, label }: LogoProps) {
	const alt = label && label.length > 0 ? label : "";

	return (
		<span
			className={cn("relative inline-flex size-9 shrink-0", className)}
			aria-hidden={alt === "" ? true : undefined}
		>
			<Image
				src="/bbrc-icon-dark.svg"
				alt={alt}
				fill
				className="object-contain dark:hidden"
				unoptimized
				sizes="(max-width: 768px) 2rem, 2.25rem"
			/>
			<Image
				src="/bbrc-icon-light.svg"
				alt={alt}
				fill
				className="hidden object-contain dark:block"
				unoptimized
				sizes="(max-width: 768px) 2rem, 2.25rem"
			/>
		</span>
	);
}
