"use client";

import { Button } from "@bbrc/ui/components/button";
import { Loader2Icon } from "lucide-react";
import { useMemo } from "react";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
	loading?: boolean;
	loadingIcon?: React.ReactNode;
	renderType?: "icon" | "text" | "icon-text";
	loadingText?: string;
}

export function LoadingButton({
	loading,
	loadingIcon = <Loader2Icon className="size-4 animate-spin" />,
	renderType = "icon-text",
	loadingText = "Loading...",
	...props
}: LoadingButtonProps) {
	const loadingContent = useMemo(() => {
		if (renderType === "icon") return loadingIcon;
		if (renderType === "text") return loadingText;

		return (
			<>
				{loadingIcon} {loadingText}
			</>
		);
	}, [renderType, loadingIcon, loadingText]);

	return (
		<Button {...props} disabled={loading || props.disabled}>
			{loading ? loadingContent : props.children}
		</Button>
	);
}
