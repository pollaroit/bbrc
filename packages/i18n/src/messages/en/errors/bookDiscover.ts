import { defineMessages } from "../../types";

export const bookDiscoverErrors = defineMessages({
	aiDailyLimit:
		"You can ask AI {count, plural, one {# time} other {# times}} a day. Try again tomorrow.",
	aiFailed: "The AI suggestion could not be made. Try again in a moment.",
	laneNotForYou: "That lane is not for you.",
});
