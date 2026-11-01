import type { ReportTargetKind } from "@bbrc/shared";
import {
	FileText,
	Library,
	MessageCircle,
	MessageSquareQuote,
	User,
} from "lucide-react";

const ICONS = {
	post: FileText,
	comment: MessageCircle,
	review: MessageSquareQuote,
	shelf: Library,
	user: User,
} as const satisfies Record<ReportTargetKind, unknown>;

export function ReportKindIcon({
	kind,
	className,
}: {
	kind: ReportTargetKind;
	className?: string;
}) {
	const Icon = ICONS[kind];
	return <Icon className={className} aria-hidden />;
}
