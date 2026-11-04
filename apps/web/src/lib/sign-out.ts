import { authClient } from "@/lib/auth-client";
import { releasePushOnSignOut } from "@/lib/push/sign-out";
import { queryClient } from "@/utils/orpc";

export async function signOutAndClear(): Promise<void> {
	queryClient.clear();
	await releasePushOnSignOut();
	await authClient.signOut();
}
