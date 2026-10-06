import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SittingAdminActions } from "@/components/blocks/sitting-admin-actions";
import { SittingAdminDeadlines } from "@/components/blocks/sitting-admin-deadlines";
import { SittingHubNav } from "@/components/blocks/sitting-hub-nav";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { formatDateTime } from "@/lib/format-datetime";

type SittingShellProps = {
	sitting: GetSittingBySlugOutput;
	children: React.ReactNode;
};

export function SittingShell({ sitting, children }: SittingShellProps) {
	return (
		<div className="flex flex-col gap-8">
			<Link
				href={"/sittings" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All sittings
			</Link>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1.5">
						<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
							{sitting.slug.replaceAll("_", " ")}
						</h1>
						<p className="text-muted-foreground text-sm">
							Started {formatDateTime(sitting.createdAt)}
						</p>
					</div>
					<div className="flex flex-col items-start gap-3 sm:items-end">
						<div className="flex flex-wrap items-center gap-2">
							<SittingStatusBadge status={sitting.status} />
							<ResourceShareMenu
								path={`/sittings/${sitting.slug}`}
								shareText={sitting.slug.replaceAll("_", " ")}
								label="Share sitting"
								storyBookSlug={sitting.selectedBook?.slug}
								size="md"
							/>
						</div>
						<div className="flex flex-wrap justify-end gap-2">
							<SittingAdminDeadlines sitting={sitting} />
							<SittingAdminActions sitting={sitting} />
						</div>
					</div>
				</div>

				<SittingHubNav sitting={sitting} />
			</div>

			{children}
		</div>
	);
}
