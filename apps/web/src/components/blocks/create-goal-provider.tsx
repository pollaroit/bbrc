"use client";

import { allowedGoalYears } from "@bbrc/shared";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { CreateGoalDialog } from "@/components/blocks/create-goal-dialog";
import { authClient } from "@/lib/auth-client";

type CreateGoalContextValue = {
	openCreateGoal: () => void;
};

const CreateGoalContext = createContext<CreateGoalContextValue | null>(null);

export function useCreateGoal(): CreateGoalContextValue {
	const value = useContext(CreateGoalContext);
	if (!value) {
		throw new Error("useCreateGoal must be used within CreateGoalProvider");
	}
	return value;
}

export function CreateGoalProvider({ children }: { children: ReactNode }) {
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);

	const openCreateGoal = useCallback(() => {
		setOpen(true);
	}, []);

	const value = useMemo(() => ({ openCreateGoal }), [openCreateGoal]);

	const username = session?.user.username;
	const allowedYears = allowedGoalYears().options;

	return (
		<CreateGoalContext value={value}>
			{children}
			{username ? (
				<CreateGoalDialog
					open={open}
					onOpenChange={setOpen}
					username={username}
					allowedYears={allowedYears}
				/>
			) : null}
		</CreateGoalContext>
	);
}
