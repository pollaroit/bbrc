"use client";

import { uniquePresentIds } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import type * as Ably from "ably";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	acquireRealtime,
	getRealtimeClient,
	reauthorizeRealtime,
} from "@/lib/realtime/client";
import { useRealtimeState } from "@/lib/realtime/use-realtime";
import { cn } from "@/lib/utils";

const CHANNEL = "dev:test";

type AuthCheck =
	| { kind: "idle" }
	| { kind: "ok"; clientId: string; capability: Record<string, string[]> }
	| { kind: "off"; message: string };

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-2 border-border border-b py-2 last:border-b-0">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="min-w-0 break-all text-end font-medium text-sm">
				{children}
			</dd>
		</div>
	);
}

/**
 * Development only. Shows whether the server hands out tokens, what the token
 * allows, whether this tab is connected, and lets you enter presence and send a
 * message on a test channel (open it in two tabs to see them talk).
 */
export function RealtimeDevPanel() {
	const state = useRealtimeState();
	const [auth, setAuth] = useState<AuthCheck>({ kind: "idle" });
	const [members, setMembers] = useState<string[]>([]);
	const [log, setLog] = useState<string[]>([]);
	const [selfId, setSelfId] = useState<string | null>(null);
	const release = useRef<(() => void) | null>(null);
	const channelRef = useRef<Ably.RealtimeChannel | null>(null);

	const note = useCallback((line: string) => {
		setLog((previous) =>
			[`${new Date().toLocaleTimeString()}  ${line}`, ...previous].slice(0, 30),
		);
	}, []);

	async function checkAuth() {
		try {
			const response = await fetch("/api/realtime/auth", { method: "POST" });
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				setAuth({
					kind: "off",
					message: `${response.status}: ${body?.error ?? "No token."}`,
				});
				return;
			}
			const token = (await response.json()) as {
				clientId: string;
				capability: string;
			};
			setAuth({
				kind: "ok",
				clientId: token.clientId,
				capability: JSON.parse(token.capability) as Record<string, string[]>,
			});
		} catch (error) {
			setAuth({
				kind: "off",
				message: error instanceof Error ? error.message : "Request failed.",
			});
		}
	}

	function connect() {
		if (release.current) return;
		release.current = acquireRealtime({ keepAlive: true });
		note("Connecting…");
	}

	function disconnect() {
		release.current?.();
		release.current = null;
		note("Released the connection (it closes in a few seconds).");
	}

	// Watch the test channel while connected.
	useEffect(() => {
		if (state !== "connected") return;
		const client = getRealtimeClient();
		if (!client) return;
		setSelfId(client.auth.clientId ?? null);
		const channel = client.channels.get(CHANNEL);
		channelRef.current = channel;

		const sync = async () => {
			try {
				setMembers(uniquePresentIds(await channel.presence.get()));
			} catch (error) {
				note(
					`Presence failed: ${error instanceof Error ? error.message : error}`,
				);
			}
		};
		const onPresence = (message: Ably.PresenceMessage) => {
			note(`presence ${message.action}: ${message.clientId.slice(0, 6)}…`);
			void sync();
		};
		const onMessage = (message: Ably.Message) =>
			note(
				`message "${String(message.data)}" from ${message.clientId?.slice(0, 6)}…`,
			);

		void channel.presence.subscribe(onPresence);
		void channel.subscribe("test", onMessage);
		void sync();
		return () => {
			channel.presence.unsubscribe(onPresence);
			channel.unsubscribe("test", onMessage);
		};
	}, [state, note]);

	useEffect(() => () => release.current?.(), []);

	async function enter() {
		await reauthorizeRealtime();
		try {
			await channelRef.current?.presence.enter();
			note("Entered presence on dev:test.");
		} catch (error) {
			note(`Enter refused: ${error instanceof Error ? error.message : error}`);
		}
	}

	async function leave() {
		try {
			await channelRef.current?.presence.leave();
			note("Left presence.");
		} catch (error) {
			note(`Leave failed: ${error instanceof Error ? error.message : error}`);
		}
	}

	async function publish() {
		try {
			await channelRef.current?.publish("test", `hello ${Date.now() % 1000}`);
		} catch (error) {
			note(
				`Publish refused: ${error instanceof Error ? error.message : error}`,
			);
		}
	}

	const connected = state === "connected";

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					Realtime check
				</h1>
				<p className="text-muted-foreground text-sm">
					Development only. Open this page in two tabs to watch them meet on a
					test channel.
				</p>
			</header>

			<section className="flex flex-col gap-3 border border-border p-4">
				<h2 className="font-medium text-sm">
					1. Does the server hand out tokens?
				</h2>
				<Button
					type="button"
					variant="outline"
					className="w-fit"
					onClick={checkAuth}
				>
					Check
				</Button>
				{auth.kind === "ok" ? (
					<dl>
						<Row label="Result">
							<span className="text-success-ink">Yes, a token was issued</span>
						</Row>
						<Row label="Your realtime id">{auth.clientId}</Row>
						<Row label="Allowed">
							<ul className="flex flex-col gap-0.5">
								{Object.entries(auth.capability).map(
									([channel, operations]) => (
										<li key={channel} className="font-mono text-xs">
											{channel}: {operations.join(", ")}
										</li>
									),
								)}
							</ul>
						</Row>
					</dl>
				) : null}
				{auth.kind === "off" ? (
					<p className="border border-warning/30 bg-warning/10 p-3 text-sm text-warning-ink">
						{auth.message} If it says 503, add <code>ABLY_API_KEY</code> to{" "}
						<code>apps/web/.env</code> and restart the dev server.
					</p>
				) : null}
			</section>

			<section className="flex flex-col gap-3 border border-border p-4">
				<h2 className="font-medium text-sm">
					2. Connect and meet on a channel
				</h2>
				<div className="flex flex-wrap gap-2">
					<Button type="button" onClick={connect}>
						Connect
					</Button>
					<Button type="button" variant="outline" onClick={disconnect}>
						Disconnect
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={!connected}
						onClick={enter}
					>
						Enter presence
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={!connected}
						onClick={leave}
					>
						Leave
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={!connected}
						onClick={publish}
					>
						Send a message
					</Button>
				</div>
				<dl>
					<Row label="Connection">
						<span
							className={cn(
								state === "connected" && "text-success-ink",
								state === "unavailable" && "text-destructive-ink",
							)}
						>
							{state}
						</span>
					</Row>
					<Row label={`Present on ${CHANNEL}`}>
						{members.length === 0
							? "nobody"
							: members
									.map((id) =>
										id === selfId
											? `${id.slice(0, 6)}… (you)`
											: `${id.slice(0, 6)}…`,
									)
									.join(", ")}
					</Row>
				</dl>
			</section>

			<section className="flex flex-col gap-2 border border-border p-4">
				<h2 className="font-medium text-sm">Log</h2>
				{log.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nothing yet.</p>
				) : (
					<ul className="flex flex-col gap-1 font-mono text-xs">
						{log.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
