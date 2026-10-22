"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { ChevronDown, Settings2 } from "lucide-react";
import { useState } from "react";
import { SittingAdminActions } from "@/components/blocks/sitting-admin-actions";
import { SittingDeadlinesRow } from "@/components/blocks/sitting-admin-deadlines";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Admin controls tucked behind one button so the header stays clean. */
export function SittingAdminPanel({
	sitting,
}: {
	sitting: GetSittingBySlugOutput;
}) {
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);

	if (!session?.user.isAdmin) {
		return null;
	}

	return (
		<section className="flex flex-col gap-3 border border-border border-dashed p-3">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="w-fit gap-1.5 px-1"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				<Settings2 data-icon="inline-start" aria-hidden />
				Admin tools
				<ChevronDown
					className={cn("size-4 transition-transform", open && "rotate-180")}
					aria-hidden
				/>
			</Button>
			{open ? (
				<ul className="flex flex-col divide-y divide-border border-border border-t pt-3">
					<SittingDeadlinesRow sitting={sitting} />
					<SittingAdminActions sitting={sitting} />
				</ul>
			) : null}
		</section>
	);
}
