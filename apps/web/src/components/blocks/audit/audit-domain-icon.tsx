import { AUDIT_DOMAINS, type AuditDomain } from "@bbrc/shared";
import {
	Armchair,
	BookOpen,
	CircleHelp,
	Feather,
	FileText,
	Flag,
	Inbox,
	Library,
	Lightbulb,
	type LucideIcon,
	Trophy,
	Users,
} from "lucide-react";

/** One icon per domain; the names come from the registry in `packages/shared/src/audit.ts`. */
const ICONS: Record<(typeof AUDIT_DOMAINS)[AuditDomain]["icon"], LucideIcon> = {
	users: Users,
	feather: Feather,
	book: BookOpen,
	library: Library,
	armchair: Armchair,
	file: FileText,
	lightbulb: Lightbulb,
	"circle-help": CircleHelp,
	trophy: Trophy,
	inbox: Inbox,
	flag: Flag,
};

export function AuditDomainIcon({
	domain,
	className,
}: {
	domain: AuditDomain;
	className?: string;
}) {
	const Icon = ICONS[AUDIT_DOMAINS[domain].icon];
	return <Icon className={className} aria-hidden />;
}
