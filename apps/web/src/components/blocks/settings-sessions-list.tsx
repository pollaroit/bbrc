"use client";

import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Laptop, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export type SettingsSessionItem = {
	token: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
	isCurrent: boolean;
};

function describeUserAgent(userAgent: string | null) {
	if (!userAgent) return { label: "Unknown device", mobile: false };

	const browser = /Edg\//.test(userAgent)
		? "Edge"
		: /OPR\//.test(userAgent)
			? "Opera"
			: /Firefox\//.test(userAgent)
				? "Firefox"
				: /Chrome\//.test(userAgent)
					? "Chrome"
					: /Safari\//.test(userAgent)
						? "Safari"
						: "Browser";

	const os = /Windows/.test(userAgent)
		? "Windows"
		: /iPhone|iPad|iOS/.test(userAgent)
			? "iOS"
			: /Android/.test(userAgent)
				? "Android"
				: /Mac OS X|Macintosh/.test(userAgent)
					? "macOS"
					: /Linux/.test(userAgent)
						? "Linux"
						: null;

	return {
		label: os ? `${browser} on ${os}` : browser,
		mobile: /Mobi|Android|iPhone|iPad/.test(userAgent),
	};
}

const dateFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function SettingsSessionsList({
	sessions,
}: {
	sessions: SettingsSessionItem[];
}) {
	const router = useRouter();
	const [pending, setPending] = useState<string | null>(null);

	const others = sessions.filter((item) => !item.isCurrent);

	async function run(
		key: string,
		action: () => Promise<{ error: { message?: string } | null }>,
		successMessage: string,
	) {
		setPending(key);
		try {
			const { error } = await action();
			if (error) {
				toast.error(error.message ?? "Something went wrong");
				return;
			}
			toast.success(successMessage);
			router.refresh();
		} finally {
			setPending(null);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<ul className="divide-y border">
				{sessions.map((item) => {
					const { label, mobile } = describeUserAgent(item.userAgent);
					const Icon = mobile ? Smartphone : Laptop;

					return (
						<li
							key={item.token}
							className="flex items-center justify-between gap-4 px-4 py-4"
						>
							<div className="flex min-w-0 items-center gap-3">
								<Icon
									className="size-5 shrink-0 text-muted-foreground"
									aria-hidden
								/>
								<div className="min-w-0">
									<p className="truncate font-medium text-sm">
										{label}
										{item.isCurrent ? (
											<span className="ml-2 border border-border px-1.5 py-0.5 font-normal text-muted-foreground text-xs">
												This device
											</span>
										) : null}
									</p>
									<p className="truncate text-muted-foreground text-sm">
										{item.ipAddress ? `${item.ipAddress} · ` : ""}
										Signed in {dateFormatter.format(new Date(item.createdAt))}
									</p>
								</div>
							</div>

							{!item.isCurrent ? (
								<LoadingButton
									variant="outline"
									size="sm"
									loading={pending === item.token}
									disabled={pending !== null}
									onClick={() =>
										run(
											item.token,
											() => authClient.revokeSession({ token: item.token }),
											"Session signed out",
										)
									}
								>
									Log out
								</LoadingButton>
							) : null}
						</li>
					);
				})}
			</ul>

			{others.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					<LoadingButton
						variant="outline"
						loading={pending === "others"}
						disabled={pending !== null}
						onClick={() =>
							run(
								"others",
								() => authClient.revokeOtherSessions(),
								"Signed out of other sessions",
							)
						}
					>
						Log out of all other sessions
					</LoadingButton>
					<LoadingButton
						variant="destructive"
						loading={pending === "all"}
						disabled={pending !== null}
						onClick={async () => {
							await run(
								"all",
								() => authClient.revokeSessions(),
								"Signed out everywhere",
							);
							router.push("/sign-in" as never);
						}}
					>
						Log out of all sessions
					</LoadingButton>
				</div>
			) : null}
		</div>
	);
}
