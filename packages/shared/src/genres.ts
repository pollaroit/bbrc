// Single source of truth for book genres and subgenres (slugs and structure). The names live in
// the `genres.names` messages, by slug: see `genreName` in `genre-text.ts`.
//
// Three levels:
// - Category: Fiction or Non Fiction
// - Genre: A broad, recognizable book genre
// - Subgenre: A more specific classification within a genre
//
// Genres can overlap in real books. This taxonomy assigns each genre
// one primary category and allows books to have multiple genre tags.

type GenreCategory = {
	slug: string;
};

const genreCategories = [
	{
		slug: "fiction",
	},
	{
		slug: "non_fiction",
	},
] as const satisfies GenreCategory[];

export type GenreCategorySlug = (typeof genreCategories)[number]["slug"];

export type Subgenre = {
	slug: string;
	description?: string;
};

export type Genre = {
	slug: string;
	description?: string;
	category: GenreCategorySlug;
	subgenres?: Subgenre[];
};

export const genres = [
	// ============================================================
	// FICTION
	// ============================================================

	{
		slug: "literary_fiction",
		description:
			"Character-driven fiction emphasizing style, themes, human nature, and literary expression.",
		category: "fiction",
		subgenres: [
			{ slug: "modernist_fiction" },
			{ slug: "postmodern_fiction" },
			{ slug: "philosophical_fiction" },
			{ slug: "experimental_fiction" },
			{ slug: "social_commentary" },
		],
	},

	{
		slug: "contemporary_fiction",
		description:
			"Fiction set primarily in the modern world, exploring present-day life and relationships.",
		category: "fiction",
		subgenres: [
			{ slug: "domestic_fiction" },
			{ slug: "family_saga" },
			{ slug: "campus_fiction" },
			{ slug: "coming_of_age" },
			{ slug: "slice_of_life" },
		],
	},

	{
		slug: "romance",
		description:
			"Stories centered on romantic relationships and emotional connection.",
		category: "fiction",
		subgenres: [
			{ slug: "historical_romance" },
			{ slug: "contemporary_romance" },
			{ slug: "romantic_comedy" },
			{ slug: "paranormal_romance" },
			{ slug: "dark_romance" },
			{ slug: "romantasy" },
			{ slug: "second_chance_romance" },
			{ slug: "slow_burn_romance" },
		],
	},

	{
		slug: "mystery",
		description:
			"Stories built around solving a puzzle, uncovering secrets, or discovering the truth.",
		category: "fiction",
		subgenres: [
			{ slug: "cozy_mystery" },
			{ slug: "detective_fiction" },
			{ slug: "amateur_sleuth" },
			{ slug: "locked_room_mystery" },
			{ slug: "whodunit" },
			{ slug: "historical_mystery" },
		],
	},

	{
		slug: "thriller",
		description:
			"Suspenseful stories driven by danger, high stakes, tension, and escalating conflict.",
		category: "fiction",
		subgenres: [
			{ slug: "psychological_thriller" },
			{ slug: "political_thriller" },
			{ slug: "legal_thriller" },
			{ slug: "medical_thriller" },
			{ slug: "spy_thriller" },
			{ slug: "conspiracy_thriller" },
			{ slug: "techno_thriller" },
			{ slug: "action_thriller" },
		],
	},

	{
		slug: "crime_fiction",
		description:
			"Fiction involving criminal activity, investigations, criminals, or the justice system.",
		category: "fiction",
		subgenres: [
			{ slug: "police_procedural" },
			{ slug: "hardboiled_crime" },
			{ slug: "noir" },
			{ slug: "organized_crime" },
			{ slug: "heist_fiction" },
			{ slug: "legal_crime_fiction" },
		],
	},

	{
		slug: "fantasy",
		description:
			"Fiction featuring magic, supernatural forces, or worlds beyond ordinary reality.",
		category: "fiction",
		subgenres: [
			{ slug: "high_fantasy" },
			{ slug: "epic_fantasy" },
			{ slug: "low_fantasy" },
			{ slug: "dark_fantasy" },
			{ slug: "urban_fantasy" },
			{ slug: "sword_and_sorcery" },
			{ slug: "fairy_tale_retelling" },
			{ slug: "mythic_fantasy" },
			{ slug: "portal_fantasy" },
			{ slug: "grimdark_fantasy" },
			{ slug: "progression_fantasy" },
		],
	},

	{
		slug: "science_fiction",
		description:
			"Fiction exploring imagined technologies, scientific possibilities, space, and future societies.",
		category: "fiction",
		subgenres: [
			{ slug: "hard_science_fiction" },
			{ slug: "space_opera" },
			{ slug: "cyberpunk" },
			{ slug: "biopunk" },
			{ slug: "military_science_fiction" },
			{ slug: "first_contact" },
			{ slug: "time_travel" },
			{ slug: "alternate_history" },
			{ slug: "post_apocalyptic" },
			{ slug: "climate_fiction" },
			{
				slug: "artificial_intelligence_fiction",
			},
		],
	},

	{
		slug: "horror",
		description:
			"Fiction designed to evoke fear, dread, unease, or psychological disturbance.",
		category: "fiction",
		subgenres: [
			{ slug: "gothic_horror" },
			{ slug: "psychological_horror" },
			{ slug: "supernatural_horror" },
			{ slug: "cosmic_horror" },
			{ slug: "folk_horror" },
			{ slug: "body_horror" },
			{ slug: "survival_horror" },
			{ slug: "slasher" },
			{ slug: "paranormal_horror" },
		],
	},

	{
		slug: "historical_fiction",
		description:
			"Fiction set in a past historical period, often incorporating real events or people.",
		category: "fiction",
		subgenres: [
			{ slug: "ancient_world" },
			{ slug: "medieval_fiction" },
			{ slug: "renaissance_fiction" },
			{ slug: "victorian_fiction" },
			{ slug: "world_war_fiction" },
			{ slug: "historical_adventure" },
			{ slug: "historical_saga" },
		],
	},

	{
		slug: "adventure",
		description:
			"Action-oriented stories involving journeys, exploration, danger, and discovery.",
		category: "fiction",
		subgenres: [
			{ slug: "survival_fiction" },
			{ slug: "exploration_fiction" },
			{ slug: "treasure_hunt" },
			{ slug: "sea_adventure" },
			{ slug: "expedition_fiction" },
		],
	},

	{
		slug: "dystopian_fiction",
		description:
			"Stories set in oppressive, dysfunctional, or otherwise undesirable societies.",
		category: "fiction",
		subgenres: [
			{ slug: "totalitarian_dystopia" },
			{ slug: "post_apocalyptic_dystopia" },
			{ slug: "environmental_dystopia" },
			{ slug: "corporate_dystopia" },
			{ slug: "utopian_fiction" },
		],
	},

	{
		slug: "speculative_fiction",
		description:
			"Fiction exploring alternative realities, imagined possibilities, or worlds that differ from our own.",
		category: "fiction",
		subgenres: [
			{ slug: "social_speculation" },
			{ slug: "philosophical_speculation" },
			{ slug: "alternate_reality" },
			{ slug: "parallel_universes" },
		],
	},

	{
		slug: "magical_realism",
		description:
			"Literary fiction blending ordinary reality with magical or extraordinary events treated as normal.",
		category: "fiction",
		subgenres: [
			{
				slug: "contemporary_magical_realism",
			},
			{
				slug: "historical_magical_realism",
			},
			{ slug: "mythic_realism" },
		],
	},

	{
		slug: "gothic_fiction",
		description:
			"Atmospheric fiction featuring dark settings, secrets, psychological tension, and the uncanny.",
		category: "fiction",
		subgenres: [
			{ slug: "southern_gothic" },
			{ slug: "gothic_romance" },
			{ slug: "contemporary_gothic" },
			{ slug: "victorian_gothic" },
		],
	},

	{
		slug: "psychological_fiction",
		description:
			"Character-focused fiction exploring inner thoughts, motivations, perception, and mental conflict.",
		category: "fiction",
		subgenres: [
			{ slug: "psychological_drama" },
			{ slug: "stream_of_consciousness" },
			{ slug: "unreliable_narrator" },
			{ slug: "existential_fiction" },
		],
	},

	{
		slug: "satire_humor",
		description:
			"Fiction using comedy, irony, parody, or exaggeration to entertain or criticize.",
		category: "fiction",
		subgenres: [
			{ slug: "political_satire" },
			{ slug: "social_satire" },
			{ slug: "absurdist_fiction" },
			{ slug: "parody" },
			{ slug: "comic_fiction" },
		],
	},

	{
		slug: "western_fiction",
		description:
			"Stories associated with the American frontier, frontier communities, and Western mythology.",
		category: "fiction",
		subgenres: [
			{ slug: "classic_western" },
			{ slug: "revisionist_western" },
			{ slug: "weird_west" },
			{ slug: "western_romance" },
		],
	},

	{
		slug: "war_fiction",
		description:
			"Fiction exploring warfare, soldiers, civilians, conflict, and the consequences of war.",
		category: "fiction",
		subgenres: [
			{ slug: "anti_war_fiction" },
			{ slug: "military_fiction" },
			{ slug: "resistance_fiction" },
			{ slug: "home_front_fiction" },
		],
	},

	{
		slug: "political_fiction",
		description:
			"Fiction focused on political power, ideology, government, revolution, and social systems.",
		category: "fiction",
		subgenres: [
			{ slug: "political_dystopia" },
			{ slug: "revolutionary_fiction" },
			{ slug: "political_intrigue" },
			{ slug: "uchronia" },
		],
	},

	{
		slug: "religious_fiction",
		description:
			"Fiction exploring religious beliefs, spiritual questions, faith, or religious communities.",
		category: "fiction",
		subgenres: [
			{ slug: "christian_fiction" },
			{ slug: "biblical_fiction" },
			{ slug: "inspirational_fiction" },
			{ slug: "spiritual_fiction" },
		],
	},

	{
		slug: "womens_fiction",
		description:
			"Fiction emphasizing women's experiences, relationships, personal growth, and life challenges.",
		category: "fiction",
		subgenres: [
			{
				slug: "womens_contemporary_fiction",
			},
			{ slug: "domestic_drama" },
			{ slug: "womens_historical_fiction" },
		],
	},

	{
		slug: "lgbtq_fiction",
		description:
			"Fiction centered on LGBTQ+ characters, relationships, experiences, or communities.",
		category: "fiction",
		subgenres: [
			{ slug: "queer_literary_fiction" },
			{ slug: "queer_romance" },
			{ slug: "queer_historical_fiction" },
			{ slug: "queer_speculative_fiction" },
		],
	},

	{
		slug: "childrens_fiction",
		description:
			"Fiction written primarily for children, with age-appropriate themes and storytelling.",
		category: "fiction",
		subgenres: [
			{ slug: "picture_books" },
			{ slug: "early_readers" },
			{ slug: "middle_grade" },
			{ slug: "childrens_fantasy" },
			{ slug: "childrens_adventure" },
		],
	},

	{
		slug: "short_stories",
		description:
			"Short-form fiction, including individual stories and collections of shorter narratives.",
		category: "fiction",
		subgenres: [
			{ slug: "flash_fiction" },
			{ slug: "short_story_collections" },
			{ slug: "anthologies" },
			{ slug: "linked_short_stories" },
		],
	},

	// ============================================================
	// NON FICTION
	// ============================================================

	{
		slug: "biography",
		description:
			"Nonfiction accounts of a person's life, achievements, experiences, and historical significance.",
		category: "non_fiction",
		subgenres: [
			{ slug: "political_biography" },
			{ slug: "historical_biography" },
			{ slug: "literary_biography" },
			{ slug: "celebrity_biography" },
			{ slug: "biography_collections" },
		],
	},

	{
		slug: "memoir_autobiography",
		description:
			"First-person accounts of an author's life, personal experiences, memories, and reflections.",
		category: "non_fiction",
		subgenres: [
			{ slug: "personal_memoir" },
			{ slug: "travel_memoir" },
			{ slug: "celebrity_memoir" },
			{ slug: "family_memoir" },
			{ slug: "coming_of_age_memoir" },
		],
	},

	{
		slug: "self_help",
		description:
			"Books offering practical guidance for personal growth, habits, relationships, and everyday challenges.",
		category: "non_fiction",
		subgenres: [
			{ slug: "personal_development" },
			{ slug: "productivity" },
			{ slug: "habits" },
			{ slug: "motivation" },
			{ slug: "communication_skills" },
			{ slug: "emotional_intelligence" },
			{ slug: "self_help_relationships" },
		],
	},

	{
		slug: "history",
		description:
			"Nonfiction examining past events, civilizations, people, cultures, and historical change.",
		category: "non_fiction",
		subgenres: [
			{ slug: "ancient_history" },
			{ slug: "medieval_history" },
			{ slug: "modern_history" },
			{ slug: "military_history" },
			{ slug: "social_history" },
			{ slug: "cultural_history" },
			{ slug: "world_history" },
			{ slug: "historical_revisionism" },
		],
	},

	{
		slug: "true_crime",
		description:
			"Nonfiction accounts of real criminal cases, investigations, perpetrators, and victims.",
		category: "non_fiction",
		subgenres: [
			{ slug: "serial_killers" },
			{ slug: "cold_cases" },
			{ slug: "forensic_investigation" },
			{ slug: "criminal_psychology" },
			{ slug: "unsolved_crimes" },
			{ slug: "fraud_scams" },
		],
	},

	{
		slug: "business_economics",
		description:
			"Books about organizations, entrepreneurship, management, markets, and economic systems.",
		category: "non_fiction",
		subgenres: [
			{ slug: "entrepreneurship" },
			{ slug: "leadership" },
			{ slug: "management" },
			{ slug: "economics" },
			{ slug: "marketing" },
			{ slug: "business_investing" },
			{ slug: "business_strategy" },
		],
	},

	{
		slug: "philosophy",
		description:
			"Works examining fundamental questions about existence, knowledge, ethics, reason, and reality.",
		category: "non_fiction",
		subgenres: [
			{ slug: "ethics" },
			{ slug: "existentialism" },
			{ slug: "stoicism" },
			{ slug: "metaphysics" },
			{ slug: "epistemology" },
			{ slug: "political_philosophy" },
			{ slug: "philosophy_of_mind" },
		],
	},

	{
		slug: "psychology",
		description:
			"Nonfiction about human behavior, cognition, emotions, personality, and mental processes.",
		category: "non_fiction",
		subgenres: [
			{ slug: "cognitive_psychology" },
			{ slug: "social_psychology" },
			{ slug: "behavioral_psychology" },
			{ slug: "personality_psychology" },
			{ slug: "developmental_psychology" },
			{ slug: "popular_psychology" },
		],
	},

	{
		slug: "science",
		description:
			"Nonfiction explaining scientific discoveries, theories, natural phenomena, and research.",
		category: "non_fiction",
		subgenres: [
			{ slug: "physics" },
			{ slug: "astronomy" },
			{ slug: "biology" },
			{ slug: "neuroscience" },
			{ slug: "mathematics" },
			{ slug: "chemistry" },
			{ slug: "evolution" },
			{ slug: "popular_science" },
		],
	},

	{
		slug: "health_fitness",
		description:
			"Nonfiction about physical health, exercise, nutrition, well-being, and healthy living.",
		category: "non_fiction",
		subgenres: [
			{ slug: "nutrition" },
			{ slug: "strength_training" },
			{ slug: "sports_exercise" },
			{ slug: "mental_wellness" },
			{ slug: "sleep" },
			{ slug: "healthy_aging" },
		],
	},

	{
		slug: "religion_spirituality",
		description:
			"Nonfiction exploring religious traditions, spiritual practices, beliefs, and sacred texts.",
		category: "non_fiction",
		subgenres: [
			{ slug: "christianity" },
			{ slug: "islam" },
			{ slug: "buddhism" },
			{ slug: "hinduism" },
			{ slug: "comparative_religion" },
			{ slug: "mysticism" },
			{ slug: "atheism_secularism" },
		],
	},

	{
		slug: "politics_society",
		description:
			"Nonfiction about political systems, public policy, social structures, and collective behavior.",
		category: "non_fiction",
		subgenres: [
			{ slug: "political_theory" },
			{ slug: "international_relations" },
			{ slug: "sociology" },
			{ slug: "anthropology" },
			{ slug: "social_issues" },
			{ slug: "geopolitics" },
			{ slug: "cultural_studies" },
		],
	},

	{
		slug: "travel",
		description:
			"Nonfiction about journeys, destinations, travel experiences, and the exploration of places.",
		category: "non_fiction",
		subgenres: [
			{ slug: "travel_writing" },
			{ slug: "travel_guides" },
			{ slug: "adventure_travel" },
			{ slug: "cultural_travel" },
			{ slug: "exploration_discovery" },
		],
	},

	{
		slug: "personal_finance",
		description:
			"Books about managing money, budgeting, saving, investing, and building financial security.",
		category: "non_fiction",
		subgenres: [
			{ slug: "budgeting" },
			{ slug: "saving_money" },
			{ slug: "investing_wealth" },
			{ slug: "real_estate_finance" },
			{ slug: "retirement_planning" },
			{ slug: "financial_independence" },
		],
	},

	{
		slug: "essays",
		description:
			"Nonfiction prose presenting personal reflections, arguments, observations, or cultural criticism.",
		category: "non_fiction",
		subgenres: [
			{ slug: "personal_essays" },
			{ slug: "literary_essays" },
			{ slug: "cultural_criticism" },
			{ slug: "political_essays" },
			{ slug: "collected_essays" },
		],
	},
] as const satisfies Genre[];

export type GenreSlug = (typeof genres)[number]["slug"];

export type SubgenreSlug =
	(typeof genres)[number]["subgenres"] extends readonly (infer S)[]
		? S extends { slug: infer Slug extends string }
			? Slug
			: never
		: never;
