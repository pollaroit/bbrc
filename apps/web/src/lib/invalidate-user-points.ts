import { orpc, queryClient } from "@/utils/orpc";

/** Refetch member XP/RP after point changes. */
export async function invalidateUserPointQueries(): Promise<void> {
	await queryClient.invalidateQueries({
		queryKey: orpc.user.getUserList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.user.getUserByUsername.key(),
	});
}
