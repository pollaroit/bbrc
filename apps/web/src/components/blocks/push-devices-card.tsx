"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	activatePush,
	deactivatePush,
	localPushDeviceId,
	localPushDeviceSecret,
	needsHomeScreenForPush,
	type PushPermission,
	pushPermission,
} from "@/lib/push/client";
import { orpc, queryClient } from "@/utils/orpc";

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** Turn push on or off for this browser, and see or remove the other devices that get push. */
export function PushDevicesCard() {
	const devicesQuery = useQuery(orpc.push.listDevices.queryOptions());
	const [permission, setPermission] = useState<PushPermission>("default");
	const [localId, setLocalId] = useState<string | null>(null);
	const [homeScreen, setHomeScreen] = useState(false);

	useEffect(() => {
		setPermission(pushPermission());
		setLocalId(localPushDeviceId());
		setHomeScreen(needsHomeScreenForPush());
	}, []);

	const devicesKey = orpc.push.listDevices.queryKey();
	const registerMutation = useMutation(
		orpc.push.registerDevice.mutationOptions(),
	);
	const removeMutation = useMutation(orpc.push.removeDevice.mutationOptions());
	const testMutation = useMutation(orpc.push.sendTest.mutationOptions());

	const registered = devicesQuery.data?.devices ?? [];
	const thisDevice = localId
		? registered.find((device) => device.deviceId === localId)
		: undefined;

	const enable = useMutation({
		mutationFn: async () => {
			const deviceId = await activatePush();
			const deviceSecret = localPushDeviceSecret();
			if (!deviceSecret) throw new Error("Could not register this device.");
			await registerMutation.mutateAsync({
				deviceId,
				deviceSecret,
				userAgent: navigator.userAgent,
			});
			return deviceId;
		},
		onSuccess: async (deviceId) => {
			setLocalId(deviceId);
			setPermission(pushPermission());
			toast.success("Push is on for this device.");
			await queryClient.invalidateQueries({ queryKey: devicesKey });
		},
		onError: (error) => {
			setPermission(pushPermission());
			toast.error(error.message);
		},
	});

	const disable = useMutation({
		mutationFn: async () => {
			if (localId) {
				await removeMutation.mutateAsync({ deviceId: localId });
			}
			await deactivatePush();
		},
		onSuccess: async () => {
			setLocalId(null);
			toast.success("Push is off for this device.");
			await queryClient.invalidateQueries({ queryKey: devicesKey });
		},
		onError: (error) => toast.error(error.message),
	});

	const removeOther = useMutation(
		orpc.push.removeDevice.mutationOptions({
			onSuccess: async () => {
				toast.success("Device removed.");
				await queryClient.invalidateQueries({ queryKey: devicesKey });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const others = registered.filter((device) => device.deviceId !== localId);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Push on this device</CardTitle>
				<CardDescription>
					Get a notification on this phone or computer even when BBRC is closed.
					The Push boxes below choose which events send one.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				{permission === "unsupported" ? (
					<p className="text-muted-foreground text-sm">
						This browser cannot receive push notifications.
					</p>
				) : homeScreen ? (
					<p className="text-muted-foreground text-sm">
						On iPhone and iPad, push works from the Home Screen app. Open Share,
						choose Add to Home Screen, then open BBRC from there and come back
						to this page.
					</p>
				) : permission === "denied" ? (
					<p className="text-muted-foreground text-sm">
						Notifications are blocked for this site. Allow them in your browser
						settings, then reload this page.
					</p>
				) : thisDevice ? (
					<div className="flex flex-wrap items-center gap-2">
						<p className="mr-auto text-sm">
							Push is on for <strong>{thisDevice.label}</strong>.
						</p>
						<LoadingButton
							type="button"
							variant="outline"
							size="sm"
							loading={testMutation.isPending}
							onClick={() =>
								testMutation.mutate(undefined, {
									onSuccess: (result) =>
										result.devices > 0
											? toast.success(
													"Test sent. It should arrive in a moment.",
												)
											: toast.error("No device is registered yet."),
									onError: (error) => toast.error(error.message),
								})
							}
						>
							Send a test
						</LoadingButton>
						<LoadingButton
							type="button"
							variant="outline"
							size="sm"
							loading={disable.isPending}
							onClick={() => disable.mutate()}
						>
							Turn off
						</LoadingButton>
					</div>
				) : (
					<LoadingButton
						type="button"
						className="w-fit"
						loading={enable.isPending}
						onClick={() => enable.mutate()}
					>
						Turn on push for this device
					</LoadingButton>
				)}

				{others.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className="font-medium text-sm">Your other devices</p>
						<ul className="flex flex-col gap-2">
							{others.map((device) => (
								<li
									key={device.deviceId}
									className="flex items-center justify-between gap-3 border p-3"
								>
									<div className="min-w-0">
										<p className="truncate text-sm">{device.label}</p>
										<p className="text-muted-foreground text-xs">
											Added {formatter.format(device.createdAt)}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={removeOther.isPending}
										onClick={() =>
											removeOther.mutate({ deviceId: device.deviceId })
										}
									>
										Remove
									</Button>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
