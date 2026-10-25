"use client";

import { Button } from "@bbrc/ui/components/button";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * The layout for filling in a book. Used by Add, Request and Edit.
 *
 * Desktop (lg and up): a sticky column on the left with the live preview card and
 * a section index that follows your scrolling; the sections stacked on the right.
 *
 * Phones and tablets: the preview folds into a "Preview" row, the sections
 * become an accordion (one open at a time) with a "Next" button and a step
 * counter, so nothing is a wall of fields.
 *
 * Both share one sticky action bar at the bottom.
 *
 * <BookWorkspace
 *   header      shown above everything (queue progress, the back button, a book switcher)
 *   preview     usually <BookPreviewCard …/>
 *   sections    [{ id, title, description?, status?, summary?, content }]
 *                 status   "complete" shows a check, "attention" a warning dot
 *                 summary  one line shown on the closed header on phones ("Book 2 of a series")
 *                 content  the fields: this is where the other components plug in
 *   actionBar   the buttons: use <BookWorkspaceActionBar leading trailing />
 *   initialOpenId  the section open first on phones (default: the first one)
 * />
 */

export type WorkspaceSection = {
	id: string;
	title: string;
	description?: string;
	status?: "complete" | "attention";
	summary?: string;
	content: ReactNode;
};

type BookWorkspaceProps = {
	header?: ReactNode;
	preview: ReactNode;
	sections: WorkspaceSection[];
	actionBar: ReactNode;
	initialOpenId?: string;
	className?: string;
};

function StatusMark({ status }: { status: WorkspaceSection["status"] }) {
	if (status === "complete") {
		return (
			<span className="inline-flex size-4 items-center justify-center bg-success/15 text-success-ink">
				<Check className="size-3" aria-label="Complete" />
			</span>
		);
	}
	if (status === "attention") {
		return (
			<AlertCircle
				className="size-4 text-warning-ink"
				aria-label="Needs attention"
			/>
		);
	}
	return null;
}

export function BookWorkspace({
	header,
	preview,
	sections,
	actionBar,
	initialOpenId,
	className,
}: BookWorkspaceProps) {
	const uid = useId();
	const [openId, setOpenId] = useState(initialOpenId ?? sections[0]?.id ?? "");
	const [spyId, setSpyId] = useState(sections[0]?.id ?? "");
	const openIndex = Math.max(
		0,
		sections.findIndex((section) => section.id === openId),
	);

	// Desktop: highlight the section that is nearest the top while scrolling.
	const idsKey = sections.map((section) => section.id).join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: observers follow the section ids
	useEffect(() => {
		const elements = sections
			.map((section) => document.getElementById(`${uid}-${section.id}`))
			.filter((element): element is HTMLElement => element != null);
		if (elements.length === 0 || !("IntersectionObserver" in window)) return;
		const visible = new Map<string, number>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const id = entry.target.id.slice(uid.length + 1);
					if (entry.isIntersecting)
						visible.set(id, entry.boundingClientRect.top);
					else visible.delete(id);
				}
				const first = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
				if (first) setSpyId(first[0]);
			},
			{ rootMargin: "-96px 0px -55% 0px", threshold: 0 },
		);
		for (const element of elements) observer.observe(element);
		return () => observer.disconnect();
	}, [idsKey, uid]);

	function goTo(id: string) {
		setOpenId(id);
		requestAnimationFrame(() => {
			document
				.getElementById(`${uid}-${id}`)
				?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	}

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{header}

			<div className="grid gap-6 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)] lg:items-start">
				<aside className="flex flex-col gap-4 max-lg:hidden lg:sticky lg:top-20">
					{preview}
					<nav aria-label="Sections of this form">
						<ol className="flex flex-col border border-border">
							{sections.map((section) => {
								const active = section.id === spyId;
								return (
									<li
										key={section.id}
										className="border-border border-b last:border-b-0"
									>
										<button
											type="button"
											aria-current={active ? "location" : undefined}
											onClick={() => goTo(section.id)}
											className={cn(
												"flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
												active
													? "bg-muted/50 font-medium text-foreground"
													: "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
											)}
										>
											{section.title}
											<StatusMark status={section.status} />
										</button>
									</li>
								);
							})}
						</ol>
					</nav>
				</aside>

				<div className="flex min-w-0 flex-col gap-3">
					<details className="border border-border lg:hidden">
						<summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-medium text-sm">
							Preview
							<ChevronDown
								className="size-4 text-muted-foreground"
								aria-hidden
							/>
						</summary>
						<div className="border-border border-t p-3">{preview}</div>
					</details>

					<p
						className="flex items-center gap-2 text-muted-foreground text-xs tabular-nums lg:hidden"
						aria-live="polite"
					>
						Step {openIndex + 1} of {sections.length}
						<span className="flex flex-1 gap-1" aria-hidden>
							{sections.map((section, index) => (
								<span
									key={section.id}
									className={cn(
										"h-1 flex-1",
										index <= openIndex ? "bg-foreground" : "bg-muted",
									)}
								/>
							))}
						</span>
					</p>

					{sections.map((section, index) => {
						const open = section.id === openId;
						const next = sections[index + 1];
						return (
							<section
								key={section.id}
								id={`${uid}-${section.id}`}
								aria-labelledby={`${uid}-${section.id}-title`}
								className="scroll-mt-24 border border-border bg-card"
							>
								<h2 id={`${uid}-${section.id}-title`} className="m-0">
									<button
										type="button"
										aria-expanded={open}
										aria-controls={`${uid}-${section.id}-panel`}
										onClick={() => setOpenId(open ? "" : section.id)}
										className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start outline-none focus-visible:bg-muted/40 lg:pointer-events-none lg:py-3.5"
									>
										<span className="flex min-w-0 flex-col">
											<span className="flex items-center gap-2 font-semibold text-sm tracking-tight sm:text-base">
												{section.title}
												<StatusMark status={section.status} />
											</span>
											{!open && section.summary ? (
												<span className="truncate font-normal text-muted-foreground text-xs lg:hidden">
													{section.summary}
												</span>
											) : null}
										</span>
										<ChevronDown
											className={cn(
												"size-4 shrink-0 text-muted-foreground transition-transform lg:hidden",
												open && "rotate-180",
											)}
											aria-hidden
										/>
									</button>
								</h2>
								<div
									id={`${uid}-${section.id}-panel`}
									className={cn(
										"flex flex-col gap-4 border-border border-t px-4 py-4",
										!open && "max-lg:hidden",
									)}
								>
									{section.description ? (
										<p className="max-w-prose text-muted-foreground text-sm">
											{section.description}
										</p>
									) : null}
									{section.content}
									{next ? (
										<div className="flex justify-end lg:hidden">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => goTo(next.id)}
											>
												Next: {next.title}
											</Button>
										</div>
									) : null}
								</div>
							</section>
						);
					})}
				</div>
			</div>

			<div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border border-border bg-background/95 p-3 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:bottom-4">
				{actionBar}
			</div>
		</div>
	);
}

/**
 * The buttons row for `actionBar`: secondary actions on the left (Cancel, Back
 * to search), the main one on the right. Stacks on narrow screens.
 */
export function BookWorkspaceActionBar({
	leading,
	trailing,
	hint,
}: {
	leading?: ReactNode;
	trailing: ReactNode;
	/** A line above the buttons, e.g. why Save is disabled. */
	hint?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-2">{leading}</div>
				<div className="flex flex-wrap items-center gap-2 sm:justify-end">
					{trailing}
				</div>
			</div>
		</div>
	);
}
