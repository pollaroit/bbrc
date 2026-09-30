import { Skeleton } from "@bbrc/ui/components/skeleton";

export default function UserProfileLoading() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-8 w-56" />
			<Skeleton className="h-4 w-36" />
		</div>
	);
}
