import { protectedProcedure } from "../../procedures";
import {
	ListPushDevicesOutputSchema,
	OkSchema,
	RegisterPushDeviceInputSchema,
	RemovePushDeviceInputSchema,
	SendTestPushOutputSchema,
} from "./push.schema";
import {
	listPushDevices,
	registerPushDevice,
	removePushDevice,
	sendTestPush,
} from "./push.service";

export const pushRouter = {
	registerDevice: protectedProcedure
		.input(RegisterPushDeviceInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			registerPushDevice(context.db, context.session.user.id, input),
		),
	listDevices: protectedProcedure
		.output(ListPushDevicesOutputSchema)
		.handler(({ context }) =>
			listPushDevices(context.db, context.session.user.id),
		),
	removeDevice: protectedProcedure
		.input(RemovePushDeviceInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			removePushDevice(context.db, context.session.user.id, input.deviceId),
		),
	sendTest: protectedProcedure
		.output(SendTestPushOutputSchema)
		.handler(({ context }) =>
			sendTestPush(context.db, context.session.user.id),
		),
};
