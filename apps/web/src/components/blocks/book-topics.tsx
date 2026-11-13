"use client";

import { subjectNameToSlug } from "@bbrc/shared";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { CalendarRange, type LucideIcon, Tag, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { BOOK_TONES, type BookTone } from "@/lib/book-tones";
import { cn } from "@/lib/utils";

const PREVIEW = 12;

const chipClass =
	"inline-flex h-7 max-w-full items-center border border-border px-2 text-sm";

function TopicChip({ name, href }: { name: string; href?: Route }) {
	const content = <span className="truncate">{name}</span>;
	return href ? (
		<Link
			href={href}
			className={cn(
				chipClass,
				"transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none",
			)}
		>
			{content}
		</Link>
	) : (
		<span className={chipClass}>{content}</span>
	);
}

function TopicGroup({
	label,
	icon: Icon,
	tone,
	items,
	linkSubjects = false,
}: {
	label: string;
	icon: LucideIcon;
	tone: BookTone;
	items: string[];
	linkSubjects?: boolean;
}) {
	const [open, setOpen] = useState(false);
	if (items.length === 0) return null;

	const hrefFor = (name: string) =>
		linkSubjects
			? (`/books?subjects=${encodeURIComponent(subjectNameToSlug(name))}` as Route)
			: undefined;
	const hidden = items.length - PREVIEW;

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<h3 className="flex items-center gap-2 font-medium text-sm">
				<Icon
					className={cn("size-4 shrink-0", BOOK_TONES[tone].ink)}
					aria-hidden
				/>
				{label}
				<span className="text-muted-foreground tabular-nums">
					{items.length}
				</span>
			</h3>
			<ul className="flex flex-wrap gap-1.5">
				{items.slice(0, PREVIEW).map((name) => (
					<li key={name} className="min-w-0 max-w-full">
						<TopicChip name={name} href={hrefFor(name)} />
					</li>
				))}
				{hidden > 0 ? (
					<li>
						<button
							type="button"
							onClick={() => setOpen(true)}
							className={cn(
								chipClass,
								"cursor-pointer text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none",
							)}
						>
							+{hidden} more
						</button>
					</li>
				) : null}
			</ul>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(85vh,560px)] flex-col gap-4 sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{label}</DialogTitle>
					</DialogHeader>
					<ul className="-mx-1 flex flex-wrap gap-1.5 overflow-y-auto px-1 pb-1">
						{items.map((name) => (
							<li key={name} className="min-w-0 max-w-full">
								<TopicChip name={name} href={hrefFor(name)} />
							</li>
						))}
					</ul>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** Open Library's subjects, people and times & places as chips that open the filtered catalogue. */
export function BookTopics({
	subjects,
	people,
	times,
}: {
	subjects: string[];
	people: string[];
	times: string[];
}) {
	return (
		<div className="flex flex-col gap-5">
			<TopicGroup
				label="Subjects"
				icon={Tag}
				tone="violet"
				items={subjects}
				linkSubjects
			/>
			<TopicGroup label="People" icon={Users} tone="pink" items={people} />
			<TopicGroup
				label="Times and places"
				icon={CalendarRange}
				tone="info"
				items={times}
			/>
		</div>
	);
}
