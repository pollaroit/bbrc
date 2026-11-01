"use client";

import type { ListAuditLogOutput } from "@bbrc/api/modules/audit/audit.schema";
import {
	AUDIT_DOMAINS,
	auditActionDomain,
	auditActionLabel,
	summarizeAudit,
} from "@bbrc/shared";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { AuditDomainIcon } from "@/components/blocks/audit/audit-domain-icon";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { formatDateTime } from "@/lib/format-datetime";
import { auditTargetTypeLabels } from "@/lib/listing/audit-listing";
import { cn } from "@/lib/utils";

type AuditItem = ListAuditLogOutput["items"][number];

function targetTypeLabel(type: string): string {
	return (auditTargetTypeLabels as Record<string, string>)[type] ?? type;
}

export function AuditRow({ item }: { item: AuditItem }) {
	const [open, setOpen] = useState(false);
	const detailsId = useId();
	const domain = auditActionDomain(item.action);
	const summary = summarizeAudit(item.action, item.metadata, item.targetLabel);
	const actorGone = item.actor.id === null;

	return (
		<li className="bg-card">
			<button
				type="button"
				aria-expanded={open}
				aria-controls={detailsId}
				onClick={() => setOpen((value) => !value)}
				className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
			>
				<UserAvatar
					user={{ name: item.actor.name, image: item.actor.image }}
					className="mt-0.5 size-9"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span className="font-medium text-sm">{item.actor.name}</span>
						{actorGone ? (
							<span className="text-muted-foreground text-xs">
								member deleted
							</span>
						) : null}
						<span className="inline-flex items-center gap-1.5 border border-border bg-muted/50 px-2 py-0.5 text-xs">
							{domain ? (
								<AuditDomainIcon
									domain={domain}
									className="size-3.5 text-muted-foreground"
								/>
							) : null}
							{auditActionLabel(item.action)}
						</span>
					</div>
					<p className="text-sm">{summary}</p>
					<p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
						<span>{targetTypeLabel(item.targetType)}</span>
						{item.targetLabel ? (
							item.targetHref ? (
								<Link
									href={item.targetHref as never}
									onClick={(event) => event.stopPropagation()}
									className="font-medium text-foreground underline-offset-4 hover:underline"
								>
									{item.targetLabel}
								</Link>
							) : (
								<span className="text-foreground">{item.targetLabel}</span>
							)
						) : null}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-3 pt-0.5 text-muted-foreground text-xs">
					<RelativeTime date={item.createdAt} />
					<ChevronDown
						className={cn(
							"size-4 transition-transform motion-reduce:transition-none",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</div>
			</button>

			{open ? (
				<div
					id={detailsId}
					className="flex flex-col gap-4 border-border border-t bg-muted/20 px-4 py-4 sm:pl-[4.25rem]"
				>
					<dl className="grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
						<Detail label="When">{formatDateTime(item.createdAt)}</Detail>
						<Detail label="Action">
							<code className="font-mono">{item.action}</code>
							{domain ? (
								<span className="text-muted-foreground">
									{" "}
									in {AUDIT_DOMAINS[domain].label}
								</span>
							) : null}
						</Detail>
						<Detail label="Who">
							{item.actor.name}
							{item.actor.username ? (
								<span className="text-muted-foreground">
									{" "}
									@{item.actor.username}
								</span>
							) : null}
						</Detail>
						<Detail label="Target">
							{targetTypeLabel(item.targetType)}
							{item.targetLabel ? `: ${item.targetLabel}` : ""}
						</Detail>
						{item.targetId ? (
							<Detail label="Target id">
								<code className="break-all font-mono">{item.targetId}</code>
							</Detail>
						) : null}
					</dl>
					<div className="flex flex-col gap-1.5">
						<span className="text-muted-foreground text-xs">Details</span>
						<pre className="max-h-72 overflow-auto border border-border bg-background p-3 font-mono text-xs leading-relaxed">
							{JSON.stringify(item.metadata ?? {}, null, 2)}
						</pre>
					</div>
				</div>
			) : null}
		</li>
	);
}

function Detail({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-muted-foreground">{label}</dt>
			<dd>{children}</dd>
		</div>
	);
}
