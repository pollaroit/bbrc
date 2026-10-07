"use client";

import { Button } from "@bbrc/ui/components/button";
import { Loader2Icon } from "lucide-react";
import { Children, isValidElement, useMemo } from "react";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
	loading?: boolean;
	loadingIcon?: React.ReactNode;
	renderType?: "icon" | "text" | "icon-text";
	loadingText?: string;
}

function isInlineStartIcon(child: React.ReactNode): boolean {
	if (!isValidElement(child)) {
		return false;
	}
	const dataIcon = (child.props as { "data-icon"?: string })["data-icon"];
	return dataIcon === "inline-start" || dataIcon === "inline-end";
}

export function LoadingButton({
	loading,
	loadingIcon = <Loader2Icon className="size-4 animate-spin" />,
	renderType = "icon-text",
	loadingText = "Loading...",
	children,
	...props
}: LoadingButtonProps) {
	const loadingContent = useMemo(() => {
		if (renderType === "icon") return loadingIcon;
		if (renderType === "text") return loadingText;

		const parts = Children.toArray(children);
		const labelParts = parts.filter((part) => !isInlineStartIcon(part));

		return (
			<>
				{loadingIcon}
				{labelParts.length > 0 ? labelParts : loadingText}
			</>
		);
	}, [renderType, loadingIcon, loadingText, children]);

	return (
		<Button {...props} disabled={loading || props.disabled}>
			{loading ? loadingContent : children}
		</Button>
	);
}
