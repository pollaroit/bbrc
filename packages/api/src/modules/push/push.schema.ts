import type { z } from "zod";
import zod from "zod";

export const RegisterPushDeviceInputSchema = zod.object({
	/** Ably's id for this browser, from the activation. */
	deviceId: zod.string().min(8).max(200),
	/** The device's secret from the activation: proves this browser owns the device. */
	deviceSecret: zod.string().min(8).max(500),
	/** Only used to give the device a readable name. */
	userAgent: zod.string().max(500),
});

export const PushDeviceSchema = zod.object({
	deviceId: zod.string(),
	label: zod.string(),
	createdAt: zod.coerce.date(),
	lastSeenAt: zod.coerce.date(),
});

export const ListPushDevicesOutputSchema = zod.object({
	devices: zod.array(PushDeviceSchema),
});

export const RemovePushDeviceInputSchema = zod.object({
	deviceId: zod.string().min(1).max(200),
});

export const OkSchema = zod.object({ ok: zod.literal(true) });

export const SendTestPushOutputSchema = zod.object({
	/** How many devices the test was sent to. */
	devices: zod.number().int().min(0),
});

export type RegisterPushDeviceInput = z.infer<
	typeof RegisterPushDeviceInputSchema
>;
export type PushDeviceView = z.infer<typeof PushDeviceSchema>;
