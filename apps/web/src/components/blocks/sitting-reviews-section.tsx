import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";

type SittingReviewsSectionProps = {
	reviews: GetSittingBySlugOutput["reviews"];
	participantCount: number;
};

export function SittingReviewsSection({
	reviews,
	participantCount,
}: SittingReviewsSectionProps) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<h2 className="font-semibold text-lg">Reviews</h2>
				<p className="text-muted-foreground text-sm tabular-nums">
					{reviews.length} of {participantCount} participants
				</p>
			</div>

			{reviews.length === 0 ? (
				<Card size="sm">
					<CardContent className="text-muted-foreground text-sm">
						No club reviews for this book yet. Members can leave feedback on the
						book page once they finish reading.
					</CardContent>
				</Card>
			) : (
				<ul className="flex flex-col gap-3">
					{reviews.map((review) => (
						<li key={review.authorId}>
							<Card size="sm">
								<CardContent className="flex flex-col gap-3">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<UserPanel user={review} />
										<div className="flex flex-col items-end gap-1 text-right">
											<Badge variant="outline" className="tabular-nums">
												{review.rating.toFixed(1)} / 5
											</Badge>
											<p className="text-muted-foreground text-xs">
												{formatDateTime(review.createdAt)}
											</p>
										</div>
									</div>
									<p className="text-sm leading-relaxed">{review.review}</p>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
