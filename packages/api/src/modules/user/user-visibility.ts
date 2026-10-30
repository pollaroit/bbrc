import { ORPCError } from "@orpc/server";

/** A member that does not exist (or that the viewer may not reach) reads as not found. */
export function throwMemberNotFound(username?: string): never {
	throw new ORPCError("NOT_FOUND", {
		message: username
			? `User with ${username} username not found. Please check the username and try again.`
			: "User not found",
		data: username ? { username } : undefined,
	});
}
