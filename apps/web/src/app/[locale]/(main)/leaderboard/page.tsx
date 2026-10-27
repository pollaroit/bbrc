import { permanentRedirect } from "next/navigation";
import { leaderboardHubPath } from "@/lib/leaderboard/paths";

export default function LeaderboardRootPage() {
	permanentRedirect(leaderboardHubPath());
}
