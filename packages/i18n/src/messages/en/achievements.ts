import { defineMessages } from "../types";

/** Achievement texts. `items.<key>` matches the key of an achievement in code; `{n}` is its threshold. */
export const achievements = defineMessages({
	categories: {
		reading: "Reading",
		sittings: "Sittings",
		community: "Community",
		library: "Library",
		goals: "Goals",
		club: "Club",
	},
	tiers: {
		bronze: "Bronze",
		silver: "Silver",
		gold: "Gold",
		platinum: "Platinum",
		diamond: "Diamond",
		fallback: "Tier {n}",
	},
	items: {
		bookworm: {
			name: "Bookworm",
			description:
				"{n, plural, one {Mark # book as read.} other {Mark # books as read.}}",
		},
		page_turner: {
			name: "Page turner",
			description:
				"{n, plural, one {Read # page across all your books.} other {Read # pages across all your books.}}",
		},
		world_reader: {
			name: "World reader",
			description:
				"{n, plural, one {Read books from # different country.} other {Read books from # different countries.}}",
		},
		author_explorer: {
			name: "Author explorer",
			description:
				"{n, plural, one {Read # different author.} other {Read # different authors.}}",
		},
		loyal_fan: {
			name: "Loyal fan",
			description:
				"{n, plural, one {Read # book by the same author.} other {Read # books by the same author.}}",
		},
		series_finisher: {
			name: "Series finisher",
			description:
				"{n, plural, one {Read every book of # series.} other {Read every book of # series.}}",
		},
		classic_collector: {
			name: "Classic collector",
			description:
				"{n, plural, one {Read # book published before 1950.} other {Read # books published before 1950.}}",
		},
		doorstopper: {
			name: "Doorstopper",
			description:
				"{n, plural, one {Finish # book of 800 pages or more.} other {Finish # books of 800 pages or more.}}",
		},
		short_and_sweet: {
			name: "Short and sweet",
			description:
				"{n, plural, one {Finish # book of 150 pages or fewer.} other {Finish # books of 150 pages or fewer.}}",
		},
		time_traveler: {
			name: "Time traveler",
			description:
				"{n, plural, one {Read books from # different decade.} other {Read books from # different decades.}}",
		},
		steady_pace: {
			name: "Steady pace",
			description:
				"{n, plural, one {Finish a book in # different month of the same year.} other {Finish a book in # different months of the same year.}}",
		},
		busy_year: {
			name: "Busy year",
			description:
				"{n, plural, one {Read # book in a single year.} other {Read # books in a single year.}}",
		},
		trailblazer: {
			name: "Trailblazer",
			description:
				"{n, plural, one {Be the first member to mark # book as read.} other {Be the first member to mark # books as read.}}",
		},
		club_regular: {
			name: "Club regular",
			description:
				"{n, plural, one {Finish # sitting.} other {Finish # sittings.}}",
		},
		on_a_roll: {
			name: "On a roll",
			description:
				"{n, plural, one {Finish # sitting in a row.} other {Finish # sittings in a row.}}",
		},
		perfect_attendance: {
			name: "Perfect attendance",
			description:
				"Finish every sitting of a year (at least {n, number}) without a single did-not-finish. Awarded once the year is over.",
		},
		ahead_of_schedule: {
			name: "Ahead of schedule",
			description:
				"{n, plural, one {Finish # sitting at least three days before the deadline.} other {Finish # sittings at least three days before the deadline.}}",
		},
		active_voter: {
			name: "Active voter",
			description:
				"{n, plural, one {Vote in # book poll.} other {Vote in # book polls.}}",
		},
		kingmaker: {
			name: "Kingmaker",
			description:
				"{n, plural, one {Vote for the book that won the poll # time.} other {Vote for the book that won the poll # times.}}",
		},
		critic: {
			name: "Critic",
			description:
				"{n, plural, one {Write # book review.} other {Write # book reviews.}}",
		},
		long_form_critic: {
			name: "Long-form critic",
			description:
				"{n, plural, one {Write # review of 300 characters or more.} other {Write # reviews of 300 characters or more.}}",
		},
		crowd_pleaser: {
			name: "Crowd pleaser",
			description:
				"{n, plural, one {Get # like on a single review.} other {Get # likes on a single review.}}",
		},
		well_loved: {
			name: "Well loved",
			description:
				"{n, plural, one {Receive # like on your posts, comments and reviews.} other {Receive # likes on your posts, comments and reviews.}}",
		},
		voice_of_the_club: {
			name: "Voice of the club",
			description:
				"{n, plural, one {Share # post with the club.} other {Share # posts with the club.}}",
		},
		conversation_starter: {
			name: "Conversation starter",
			description:
				"{n, plural, one {Get # comment on one of your posts.} other {Get # comments on one of your posts.}}",
		},
		chatterbox: {
			name: "Chatterbox",
			description:
				"{n, plural, one {Write # comment.} other {Write # comments.}}",
		},
		librarians_helper: {
			name: "Librarian's helper",
			description:
				"{n, plural, one {Share # document that the admins approved.} other {Share # documents that the admins approved.}}",
		},
		book_scout: {
			name: "Book scout",
			description:
				"{n, plural, one {Request # book that made it into the library.} other {Request # books that made it into the library.}}",
		},
		curator: {
			name: "Curator",
			description:
				"{n, plural, one {Create # public shelf.} other {Create # public shelves.}}",
		},
		big_shelf: {
			name: "Big shelf",
			description:
				"{n, plural, one {Put # book on one shelf.} other {Put # books on one shelf.}}",
		},
		all_time_favorites: {
			name: "All-time favorites",
			description: "Fill all {n, number} of your favorite book slots.",
		},
		quiz_taker: {
			name: "Quiz taker",
			description:
				"{n, plural, one {Complete # book quiz.} other {Complete # book quizzes.}}",
		},
		quiz_ace: {
			name: "Quiz ace",
			description:
				"{n, plural, one {Get a perfect score on # quiz.} other {Get a perfect score on # quizzes.}}",
		},
		goal_setter: {
			name: "Goal setter",
			description:
				"{n, plural, one {Set # reading goal.} other {Set # reading goals.}}",
		},
		goal_getter: {
			name: "Goal getter",
			description:
				"{n, plural, one {Complete # reading goal.} other {Complete # reading goals.}}",
		},
		all_about_me: {
			name: "All about me",
			description:
				"Complete your profile: a photo, a bio, a location and favorite genres.",
		},
		founding_member: {
			name: "Founding member",
			description: "Be one of the first members to join the club.",
		},
		still_here: {
			name: "Still here",
			description:
				"{n, plural, one {Be a member for # year.} other {Be a member for # years.}}",
		},
		seen: {
			name: "Seen",
			description:
				"{n, plural, one {Have one of your posts opened # time by other members.} other {Have one of your posts opened # times by other members.}}",
		},
		well_read_review: {
			name: "Well-read review",
			description:
				"{n, plural, one {Have one of your reviews opened # time.} other {Have one of your reviews opened # times.}}",
		},
		face_in_the_crowd: {
			name: "Face in the crowd",
			description:
				"{n, plural, one {Have your profile opened # time.} other {Have your profile opened # times.}}",
		},
		pace_setter: {
			name: "Pace setter",
			description:
				"{n, plural, one {Finish a book you tracked by its sitting's deadline, # time.} other {Finish a book you tracked by its sitting's deadline, # times.}}",
		},
		page_by_page: {
			name: "Page by page",
			description:
				"{n, plural, one {Log your reading progress # day in a row.} other {Log your reading progress # days in a row.}}",
		},
		wishlist_keeper: {
			name: "Wishlist keeper",
			description:
				"{n, plural, one {Keep # book on your wishlist.} other {Keep # books on your wishlist.}}",
		},
		night_owl: {
			name: "Night owl",
			description:
				"{n, plural, one {Post, comment or review between midnight and 4 AM, # time.} other {Post, comment or review between midnight and 4 AM, # times.}}",
		},
		binge_day: {
			name: "Binge day",
			description:
				"{n, plural, one {Mark # book as read on the same day.} other {Mark # books as read on the same day.}}",
		},
		redemption_arc: {
			name: "Redemption arc",
			description: "Finish a sitting right after a did-not-finish.",
		},
		photo_finish: {
			name: "Photo finish",
			description:
				"{n, plural, one {Finish a sitting within three hours of the deadline, # time.} other {Finish a sitting within three hours of the deadline, # times.}}",
		},
		leap_day: {
			name: "Leap day",
			description: "Be active on the 29th of February.",
		},
	},
});
