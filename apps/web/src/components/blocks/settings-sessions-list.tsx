"use client";

import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Laptop, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useFormatters } from "@/lib/i18n/use-formatters";

export type SettingsSessionItem = {
	token: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
	isCurrent: boolean;
};

type SessionsT = ReturnType<typeof useTranslations<"settings.sessions">>;

function describeUserAgent(userAgent: string | null, t: SessionsT) {
	if (!userAgent) return { label: t("unknownDevice"), mobile: false };

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
						: t("browser");

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
		label: os ? t("browserOnOs", { browser, os }) : browser,
		mobile: /Mobi|Android|iPhone|iPad/.test(userAgent),
	};
}

export function SettingsSessionsList({
	sessions,
}: {
	sessions: SettingsSessionItem[];
}) {
	const t = useTranslations("settings.sessions");
	const f = useFormatters();
	const router = useRouter();
	const [pending, setPending] = useState<string | null>(null);

	const signedInAt = (value: string) =>
		f.dateWith(value, { dateStyle: "medium", timeStyle: "short" });

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
				toast.error(error.message ?? t("error"));
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
					const { label, mobile } = describeUserAgent(item.userAgent, t);
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
												{t("thisDevice")}
											</span>
										) : null}
									</p>
									<p className="truncate text-muted-foreground text-sm">
										{item.ipAddress
											? t("signedInWithIp", {
													ip: item.ipAddress,
													date: signedInAt(item.createdAt),
												})
											: t("signedIn", { date: signedInAt(item.createdAt) })}
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
											t("signedOutOne"),
										)
									}
								>
									{t("logOut")}
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
								t("signedOutOthers"),
							)
						}
					>
						{t("logOutOthers")}
					</LoadingButton>
					<LoadingButton
						variant="destructive"
						loading={pending === "all"}
						disabled={pending !== null}
						onClick={async () => {
							await run(
								"all",
								() => authClient.revokeSessions(),
								t("signedOutAll"),
							);
							router.push("/sign-in" as never);
						}}
					>
						{t("logOutAll")}
					</LoadingButton>
				</div>
			) : null}
		</div>
	);
}
