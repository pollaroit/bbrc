import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { FormEventHandler, ReactNode } from "react";

type ShelfEditorShellProps = {
	title: string;
	description: string;
	backHref: Route;
	backLabel: string;
	/** Live preview shown beside the form on desktop and above it on mobile. */
	preview?: ReactNode;
	/** Renders a <form> when provided. */
	onSubmit?: FormEventHandler<HTMLFormElement>;
	footer: ReactNode;
	children: ReactNode;
};

export function ShelfEditorShell({
	title,
	description,
	backHref,
	backLabel,
	preview,
	onSubmit,
	footer,
	children,
}: ShelfEditorShellProps) {
	const body = (
		<>
			<div className="flex flex-col gap-5">{children}</div>
			<div className="grid grid-cols-2 gap-2 border-border border-t pt-4 sm:flex sm:items-center md:sticky md:bottom-0 md:z-10 md:bg-background/95 md:py-3 md:backdrop-blur">
				{footer}
			</div>
		</>
	);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-3">
				<Link
					href={backHref}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					{backLabel}
				</Link>
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
					<p className="mt-1 max-w-xl text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				</div>
			</header>

			<div
				className={
					preview
						? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10"
						: "grid max-w-2xl gap-6"
				}
			>
				{preview ? (
					<aside
						aria-label="Shelf preview"
						className="flex flex-col gap-2 lg:sticky lg:top-20 lg:order-2"
					>
						<p className="font-medium text-muted-foreground text-xs">
							How it looks on your profile
						</p>
						<div className="pointer-events-none" aria-hidden>
							{preview}
						</div>
					</aside>
				) : null}

				{onSubmit ? (
					<form
						onSubmit={onSubmit}
						className="flex min-w-0 flex-col gap-5 lg:order-1"
					>
						{body}
					</form>
				) : (
					<div className="flex min-w-0 flex-col gap-5 lg:order-1">{body}</div>
				)}
			</div>
		</div>
	);
}

export function ShelfEditorSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 border border-border px-4 py-5">
			<div>
				<h2 className="font-medium text-base">{title}</h2>
				{description ? (
					<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}
