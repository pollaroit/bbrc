import { defineMessages } from "../types";

/** What every rating means (the defaults; members can write their own). Keys: `s` + rating with `_` for the dot. */
export const ratings = defineMessages({
	definitions: {
		s0: {
			label: "Nothing works",
			text: "Nothing in it works, and you have no idea why you read it. It barely counts as a book: a child with a pen could tell a better story. There is not one good thing about it, not even a middling one, and it was a complete waste of your time. It is not a 0.5 because there is not even a single tiny thing you can say in its favour.",
		},
		s1: {
			label: "Very bad",
			text: "The flaws are everywhere and you regret the time, but you could still find a single thing that was not a failure: one good chapter, one well-written page, one clever idea. It is not a 1.5 because there is no real effort or craft to point to beyond that, and it is not a 0.5 because that one thing was actually good, not just present.",
		},
		s2: {
			label: "Poor",
			text: "You struggled through it, and the problems are in several places at once (story, characters, writing), with only a few small things worth keeping. You would warn a friend off it. It is not a 2.5 because the good parts were too slight to balance anything, and it is not a 1.5 because you can still point at something that worked or that another reader might like.",
		},
		s3: {
			label: "Decent",
			text: "A fair way to spend your time: some parts worked, some did not, and in a year you will probably remember little of it. You neither loved it nor regretted it. It is not a 3.5 because nothing in it made you really glad you read it, and it is not a 2.5 because you were never close to giving up.",
		},
		s4: {
			label: "Excellent",
			text: 'You really enjoyed it, you would recommend it without thinking twice, and its strengths (the story, the characters or the writing) are clear. It has a few visible flaws, but they never made you want to put it down. It is not a 4.5 because it did not feel like one of the best books you have read, and it is not a 3.5 because here you recommend it with no "but".',
		},
		s5: {
			label: "Masterpiece",
			text: "A masterpiece, the kind of book that comes along once in a century. You loved every page and could not look away from it. The opening, the characters, the story, the writing and the ending are all flawless, and you cannot name a single thing you would change. It is not a 4.5 because a 4.5 still has a flaw you can point at, and here there is none.",
		},
		s4_5: {
			label: "Almost a masterpiece",
			text: "You loved it, you want everyone to read it, and it will stay with you for a long time, but you can still name one small flaw: a slower stretch, a side character who did not work, an ending that was only very good. It is not a 5 because a 5 has no flaw at all, and it is not a 4 because this book felt special, not just excellent.",
		},
		s3_5: {
			label: "Good, with reservations",
			text: "You enjoyed it and you are glad you read it, but something real held it back: a middle that dragged, a rushed ending, characters you never fully believed. It is not a 4 because you would recommend it only with a warning, and it is not a 3 because the good parts clearly won over the bad ones.",
		},
		s2_5: {
			label: "Below average",
			text: "There were good moments, but the problems were bigger: a weak plot, flat characters or writing that got in the way. You kept going out of hope or duty and you would not recommend it. It is not a 3 because the frustration outweighed the enjoyment, and it is not a 2 because the good moments were real, not just a few lines.",
		},
		s1_5: {
			label: "Bad",
			text: "Almost nothing works. If you finished it, it was out of stubbornness, and one small thing (an idea, a scene, an interesting setting) is all you can say in its favour. It is not a 2 because that one thing was not enough to matter, and it is not a 1 because the book was still a real attempt with some craft behind it.",
		},
		s0_5: {
			label: "Almost nothing",
			text: "You can find one tiny thing that was not terrible (a good opening line, a decent title), and everything else was a waste of your time. It is not a 1 because even that one thing barely counts, and it is not a 0 because the 0 has absolutely nothing good in it.",
		},
	},
});
