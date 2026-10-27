import type { Messages } from "../../shape";
import { achievementErrors } from "./achievement";
import { authorErrors } from "./author";
import { bookErrors } from "./book";
import { bookDiscoverErrors } from "./bookDiscover";
import { commentErrors } from "./comment";
import { commonErrors } from "./common";
import { editionErrors } from "./edition";
import { favoriteErrors } from "./favorite";
import { feedbackErrors } from "./feedback";
import { followErrors } from "./follow";
import { goalErrors } from "./goal";
import { leaderboardErrors } from "./leaderboard";
import { likeErrors } from "./like";
import { linkPreviewErrors } from "./linkPreview";
import { mentionErrors } from "./mention";
import { notificationErrors } from "./notification";
import { peopleErrors } from "./people";
import { postErrors } from "./post";
import { postPollErrors } from "./postPoll";
import { quizErrors } from "./quiz";
import { readErrors } from "./read";
import { readingErrors } from "./reading";
import { searchErrors } from "./search";
import { seriesErrors } from "./series";
import { shelfErrors } from "./shelf";
import { sittingErrors } from "./sitting";
import { storageErrors } from "./storage";
import { userErrors } from "./user";
import { userCompareErrors } from "./userCompare";
import { viewErrors } from "./view";
import { xpErrors } from "./xp";

export const errors: Messages["errors"] = {
	common: commonErrors,
	achievement: achievementErrors,
	author: authorErrors,
	book: bookErrors,
	bookDiscover: bookDiscoverErrors,
	edition: editionErrors,
	comment: commentErrors,
	favorite: favoriteErrors,
	feedback: feedbackErrors,
	follow: followErrors,
	goal: goalErrors,
	leaderboard: leaderboardErrors,
	like: likeErrors,
	linkPreview: linkPreviewErrors,
	mention: mentionErrors,
	notification: notificationErrors,
	people: peopleErrors,
	post: postErrors,
	postPoll: postPollErrors,
	quiz: quizErrors,
	read: readErrors,
	reading: readingErrors,
	search: searchErrors,
	series: seriesErrors,
	shelf: shelfErrors,
	sitting: sittingErrors,
	storage: storageErrors,
	user: userErrors,
	userCompare: userCompareErrors,
	view: viewErrors,
	xp: xpErrors,
};
