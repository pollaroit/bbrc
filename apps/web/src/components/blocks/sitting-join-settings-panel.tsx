"use client";

import type { SittingJoinState } from "@bbrc/api/modules/sitting/sitting-join.schema";
import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SittingJoinSettingsFields } from "@/components/blocks/sitting-join-settings-fields";
import { orpc, queryClient } from "@/utils/orpc";

type Config = SittingJoinState["config"];

export function SittingJoinSettingsPanel({
	sittingSlug,
	config,
}: {
	sittingSlug: string;
	config: Config;
}) {
	const [draft, setDraft] = useState<Config>(config);
	const dirty = JSON.stringify(draft) !== JSON.stringify(config);
	const stateKey = orpc.sitting.join.state.queryKey({ input: { sittingSlug } });

	const save = useMutation(
		orpc.sitting.join.updateConfig.mutationOptions({
			onSuccess: () => toast.success("Joining settings saved"),
			onError: (error) => toast.error(error.message),
			onSettled: () => queryClient.invalidateQueries({ queryKey: stateKey }),
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<SittingJoinSettingsFields
				value={draft}
				onChange={setDraft}
				disabled={save.isPending}
			/>
			<div className="flex justify-end gap-2">
				<Button
					variant="ghost"
					disabled={!dirty || save.isPending}
					onClick={() => setDraft(config)}
				>
					Reset
				</Button>
				<Button
					disabled={!dirty || save.isPending}
					onClick={() => save.mutate({ sittingSlug, ...draft })}
				>
					Save
				</Button>
			</div>
		</div>
	);
}
