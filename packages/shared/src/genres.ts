// Single source of truth for book genres and subgenres.
//
// Three levels:
// - Category: Fiction or Non Fiction
// - Genre: A broad, recognizable book genre
// - Subgenre: A more specific classification within a genre
//
// Genres can overlap in real books. This taxonomy assigns each genre
// one primary category and allows books to have multiple genre tags.

type GenreCategory = {
	name: string;
	slug: string;
};

const genreCategories = [
	{
		name: "Fiction",
		slug: "fiction",
	},
	{
		name: "Non Fiction",
		slug: "non_fiction",
	},
] as const satisfies GenreCategory[];

export type GenreCategorySlug = (typeof genreCategories)[number]["slug"];

export type Subgenre = {
	name: string;
	slug: string;
	description?: string;
};

export type Genre = {
	name: string;
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
		name: "Literary Fiction",
		slug: "literary_fiction",
		description:
			"Character-driven fiction emphasizing style, themes, human nature, and literary expression.",
		category: "fiction",
		subgenres: [
			{ name: "Modernist Fiction", slug: "modernist_fiction" },
			{ name: "Postmodern Fiction", slug: "postmodern_fiction" },
			{ name: "Philosophical Fiction", slug: "philosophical_fiction" },
			{ name: "Experimental Fiction", slug: "experimental_fiction" },
			{ name: "Social Commentary", slug: "social_commentary" },
		],
	},

	{
		name: "Contemporary Fiction",
		slug: "contemporary_fiction",
		description:
			"Fiction set primarily in the modern world, exploring present-day life and relationships.",
		category: "fiction",
		subgenres: [
			{ name: "Domestic Fiction", slug: "domestic_fiction" },
			{ name: "Family Saga", slug: "family_saga" },
			{ name: "Campus Fiction", slug: "campus_fiction" },
			{ name: "Coming-of-Age", slug: "coming_of_age" },
			{ name: "Slice of Life", slug: "slice_of_life" },
		],
	},

	{
		name: "Romance",
		slug: "romance",
		description:
			"Stories centered on romantic relationships and emotional connection.",
		category: "fiction",
		subgenres: [
			{ name: "Historical Romance", slug: "historical_romance" },
			{ name: "Contemporary Romance", slug: "contemporary_romance" },
			{ name: "Romantic Comedy", slug: "romantic_comedy" },
			{ name: "Paranormal Romance", slug: "paranormal_romance" },
			{ name: "Dark Romance", slug: "dark_romance" },
			{ name: "Romantasy", slug: "romantasy" },
			{ name: "Second-Chance Romance", slug: "second_chance_romance" },
			{ name: "Slow-Burn Romance", slug: "slow_burn_romance" },
		],
	},

	{
		name: "Mystery",
		slug: "mystery",
		description:
			"Stories built around solving a puzzle, uncovering secrets, or discovering the truth.",
		category: "fiction",
		subgenres: [
			{ name: "Cozy Mystery", slug: "cozy_mystery" },
			{ name: "Detective Fiction", slug: "detective_fiction" },
			{ name: "Amateur Sleuth", slug: "amateur_sleuth" },
			{ name: "Locked-Room Mystery", slug: "locked_room_mystery" },
			{ name: "Whodunit", slug: "whodunit" },
			{ name: "Historical Mystery", slug: "historical_mystery" },
		],
	},

	{
		name: "Thriller",
		slug: "thriller",
		description:
			"Suspenseful stories driven by danger, high stakes, tension, and escalating conflict.",
		category: "fiction",
		subgenres: [
			{ name: "Psychological Thriller", slug: "psychological_thriller" },
			{ name: "Political Thriller", slug: "political_thriller" },
			{ name: "Legal Thriller", slug: "legal_thriller" },
			{ name: "Medical Thriller", slug: "medical_thriller" },
			{ name: "Spy Thriller", slug: "spy_thriller" },
			{ name: "Conspiracy Thriller", slug: "conspiracy_thriller" },
			{ name: "Techno-Thriller", slug: "techno_thriller" },
			{ name: "Action Thriller", slug: "action_thriller" },
		],
	},

	{
		name: "Crime Fiction",
		slug: "crime_fiction",
		description:
			"Fiction involving criminal activity, investigations, criminals, or the justice system.",
		category: "fiction",
		subgenres: [
			{ name: "Police Procedural", slug: "police_procedural" },
			{ name: "Hardboiled Crime", slug: "hardboiled_crime" },
			{ name: "Noir", slug: "noir" },
			{ name: "Organized Crime", slug: "organized_crime" },
			{ name: "Heist Fiction", slug: "heist_fiction" },
			{ name: "Legal Crime Fiction", slug: "legal_crime_fiction" },
		],
	},

	{
		name: "Fantasy",
		slug: "fantasy",
		description:
			"Fiction featuring magic, supernatural forces, or worlds beyond ordinary reality.",
		category: "fiction",
		subgenres: [
			{ name: "High Fantasy", slug: "high_fantasy" },
			{ name: "Epic Fantasy", slug: "epic_fantasy" },
			{ name: "Low Fantasy", slug: "low_fantasy" },
			{ name: "Dark Fantasy", slug: "dark_fantasy" },
			{ name: "Urban Fantasy", slug: "urban_fantasy" },
			{ name: "Sword and Sorcery", slug: "sword_and_sorcery" },
			{ name: "Fairy Tale Retelling", slug: "fairy_tale_retelling" },
			{ name: "Mythic Fantasy", slug: "mythic_fantasy" },
			{ name: "Portal Fantasy", slug: "portal_fantasy" },
			{ name: "Grimdark Fantasy", slug: "grimdark_fantasy" },
			{ name: "Progression Fantasy", slug: "progression_fantasy" },
		],
	},

	{
		name: "Science Fiction",
		slug: "science_fiction",
		description:
			"Fiction exploring imagined technologies, scientific possibilities, space, and future societies.",
		category: "fiction",
		subgenres: [
			{ name: "Hard Science Fiction", slug: "hard_science_fiction" },
			{ name: "Space Opera", slug: "space_opera" },
			{ name: "Cyberpunk", slug: "cyberpunk" },
			{ name: "Biopunk", slug: "biopunk" },
			{ name: "Military Science Fiction", slug: "military_science_fiction" },
			{ name: "First Contact", slug: "first_contact" },
			{ name: "Time Travel", slug: "time_travel" },
			{ name: "Alternate History", slug: "alternate_history" },
			{ name: "Post-Apocalyptic", slug: "post_apocalyptic" },
			{ name: "Climate Fiction", slug: "climate_fiction" },
			{
				name: "Artificial Intelligence Fiction",
				slug: "artificial_intelligence_fiction",
			},
		],
	},

	{
		name: "Horror",
		slug: "horror",
		description:
			"Fiction designed to evoke fear, dread, unease, or psychological disturbance.",
		category: "fiction",
		subgenres: [
			{ name: "Gothic Horror", slug: "gothic_horror" },
			{ name: "Psychological Horror", slug: "psychological_horror" },
			{ name: "Supernatural Horror", slug: "supernatural_horror" },
			{ name: "Cosmic Horror", slug: "cosmic_horror" },
			{ name: "Folk Horror", slug: "folk_horror" },
			{ name: "Body Horror", slug: "body_horror" },
			{ name: "Survival Horror", slug: "survival_horror" },
			{ name: "Slasher", slug: "slasher" },
			{ name: "Paranormal Horror", slug: "paranormal_horror" },
		],
	},

	{
		name: "Historical Fiction",
		slug: "historical_fiction",
		description:
			"Fiction set in a past historical period, often incorporating real events or people.",
		category: "fiction",
		subgenres: [
			{ name: "Ancient World", slug: "ancient_world" },
			{ name: "Medieval Fiction", slug: "medieval_fiction" },
			{ name: "Renaissance Fiction", slug: "renaissance_fiction" },
			{ name: "Victorian Fiction", slug: "victorian_fiction" },
			{ name: "World War Fiction", slug: "world_war_fiction" },
			{ name: "Historical Adventure", slug: "historical_adventure" },
			{ name: "Historical Saga", slug: "historical_saga" },
		],
	},

	{
		name: "Adventure",
		slug: "adventure",
		description:
			"Action-oriented stories involving journeys, exploration, danger, and discovery.",
		category: "fiction",
		subgenres: [
			{ name: "Survival Fiction", slug: "survival_fiction" },
			{ name: "Exploration Fiction", slug: "exploration_fiction" },
			{ name: "Treasure Hunt", slug: "treasure_hunt" },
			{ name: "Sea Adventure", slug: "sea_adventure" },
			{ name: "Expedition Fiction", slug: "expedition_fiction" },
		],
	},

	{
		name: "Dystopian Fiction",
		slug: "dystopian_fiction",
		description:
			"Stories set in oppressive, dysfunctional, or otherwise undesirable societies.",
		category: "fiction",
		subgenres: [
			{ name: "Totalitarian Dystopia", slug: "totalitarian_dystopia" },
			{ name: "Post-Apocalyptic Dystopia", slug: "post_apocalyptic_dystopia" },
			{ name: "Environmental Dystopia", slug: "environmental_dystopia" },
			{ name: "Corporate Dystopia", slug: "corporate_dystopia" },
			{ name: "Utopian Fiction", slug: "utopian_fiction" },
		],
	},

	{
		name: "Speculative Fiction",
		slug: "speculative_fiction",
		description:
			"Fiction exploring alternative realities, imagined possibilities, or worlds that differ from our own.",
		category: "fiction",
		subgenres: [
			{ name: "Social Speculation", slug: "social_speculation" },
			{ name: "Philosophical Speculation", slug: "philosophical_speculation" },
			{ name: "Alternate Reality", slug: "alternate_reality" },
			{ name: "Parallel Universes", slug: "parallel_universes" },
		],
	},

	{
		name: "Magical Realism",
		slug: "magical_realism",
		description:
			"Literary fiction blending ordinary reality with magical or extraordinary events treated as normal.",
		category: "fiction",
		subgenres: [
			{
				name: "Contemporary Magical Realism",
				slug: "contemporary_magical_realism",
			},
			{
				name: "Historical Magical Realism",
				slug: "historical_magical_realism",
			},
			{ name: "Mythic Realism", slug: "mythic_realism" },
		],
	},

	{
		name: "Gothic Fiction",
		slug: "gothic_fiction",
		description:
			"Atmospheric fiction featuring dark settings, secrets, psychological tension, and the uncanny.",
		category: "fiction",
		subgenres: [
			{ name: "Southern Gothic", slug: "southern_gothic" },
			{ name: "Gothic Romance", slug: "gothic_romance" },
			{ name: "Contemporary Gothic", slug: "contemporary_gothic" },
			{ name: "Victorian Gothic", slug: "victorian_gothic" },
		],
	},

	{
		name: "Psychological Fiction",
		slug: "psychological_fiction",
		description:
			"Character-focused fiction exploring inner thoughts, motivations, perception, and mental conflict.",
		category: "fiction",
		subgenres: [
			{ name: "Psychological Drama", slug: "psychological_drama" },
			{ name: "Stream of Consciousness", slug: "stream_of_consciousness" },
			{ name: "Unreliable Narrator", slug: "unreliable_narrator" },
			{ name: "Existential Fiction", slug: "existential_fiction" },
		],
	},

	{
		name: "Satire & Humor",
		slug: "satire_humor",
		description:
			"Fiction using comedy, irony, parody, or exaggeration to entertain or criticize.",
		category: "fiction",
		subgenres: [
			{ name: "Political Satire", slug: "political_satire" },
			{ name: "Social Satire", slug: "social_satire" },
			{ name: "Absurdist Fiction", slug: "absurdist_fiction" },
			{ name: "Parody", slug: "parody" },
			{ name: "Comic Fiction", slug: "comic_fiction" },
		],
	},

	{
		name: "Western Fiction",
		slug: "western_fiction",
		description:
			"Stories associated with the American frontier, frontier communities, and Western mythology.",
		category: "fiction",
		subgenres: [
			{ name: "Classic Western", slug: "classic_western" },
			{ name: "Revisionist Western", slug: "revisionist_western" },
			{ name: "Weird West", slug: "weird_west" },
			{ name: "Western Romance", slug: "western_romance" },
		],
	},

	{
		name: "War Fiction",
		slug: "war_fiction",
		description:
			"Fiction exploring warfare, soldiers, civilians, conflict, and the consequences of war.",
		category: "fiction",
		subgenres: [
			{ name: "Anti-War Fiction", slug: "anti_war_fiction" },
			{ name: "Military Fiction", slug: "military_fiction" },
			{ name: "Resistance Fiction", slug: "resistance_fiction" },
			{ name: "Home Front Fiction", slug: "home_front_fiction" },
		],
	},

	{
		name: "Political Fiction",
		slug: "political_fiction",
		description:
			"Fiction focused on political power, ideology, government, revolution, and social systems.",
		category: "fiction",
		subgenres: [
			{ name: "Political Dystopia", slug: "political_dystopia" },
			{ name: "Revolutionary Fiction", slug: "revolutionary_fiction" },
			{ name: "Political Intrigue", slug: "political_intrigue" },
			{ name: "Uchronia", slug: "uchronia" },
		],
	},

	{
		name: "Religious Fiction",
		slug: "religious_fiction",
		description:
			"Fiction exploring religious beliefs, spiritual questions, faith, or religious communities.",
		category: "fiction",
		subgenres: [
			{ name: "Christian Fiction", slug: "christian_fiction" },
			{ name: "Biblical Fiction", slug: "biblical_fiction" },
			{ name: "Inspirational Fiction", slug: "inspirational_fiction" },
			{ name: "Spiritual Fiction", slug: "spiritual_fiction" },
		],
	},

	{
		name: "Women's Fiction",
		slug: "womens_fiction",
		description:
			"Fiction emphasizing women's experiences, relationships, personal growth, and life challenges.",
		category: "fiction",
		subgenres: [
			{
				name: "Women's Contemporary Fiction",
				slug: "womens_contemporary_fiction",
			},
			{ name: "Domestic Drama", slug: "domestic_drama" },
			{ name: "Women's Historical Fiction", slug: "womens_historical_fiction" },
		],
	},

	{
		name: "LGBTQ+ Fiction",
		slug: "lgbtq_fiction",
		description:
			"Fiction centered on LGBTQ+ characters, relationships, experiences, or communities.",
		category: "fiction",
		subgenres: [
			{ name: "Queer Literary Fiction", slug: "queer_literary_fiction" },
			{ name: "Queer Romance", slug: "queer_romance" },
			{ name: "Queer Historical Fiction", slug: "queer_historical_fiction" },
			{ name: "Queer Speculative Fiction", slug: "queer_speculative_fiction" },
		],
	},

	{
		name: "Children's Fiction",
		slug: "childrens_fiction",
		description:
			"Fiction written primarily for children, with age-appropriate themes and storytelling.",
		category: "fiction",
		subgenres: [
			{ name: "Picture Books", slug: "picture_books" },
			{ name: "Early Readers", slug: "early_readers" },
			{ name: "Middle Grade", slug: "middle_grade" },
			{ name: "Children's Fantasy", slug: "childrens_fantasy" },
			{ name: "Children's Adventure", slug: "childrens_adventure" },
		],
	},

	{
		name: "Short Stories",
		slug: "short_stories",
		description:
			"Short-form fiction, including individual stories and collections of shorter narratives.",
		category: "fiction",
		subgenres: [
			{ name: "Flash Fiction", slug: "flash_fiction" },
			{ name: "Short Story Collections", slug: "short_story_collections" },
			{ name: "Anthologies", slug: "anthologies" },
			{ name: "Linked Short Stories", slug: "linked_short_stories" },
		],
	},

	// ============================================================
	// NON FICTION
	// ============================================================

	{
		name: "Biography",
		slug: "biography",
		description:
			"Nonfiction accounts of a person's life, achievements, experiences, and historical significance.",
		category: "non_fiction",
		subgenres: [
			{ name: "Political Biography", slug: "political_biography" },
			{ name: "Historical Biography", slug: "historical_biography" },
			{ name: "Literary Biography", slug: "literary_biography" },
			{ name: "Celebrity Biography", slug: "celebrity_biography" },
			{ name: "Biography Collections", slug: "biography_collections" },
		],
	},

	{
		name: "Memoir & Autobiography",
		slug: "memoir_autobiography",
		description:
			"First-person accounts of an author's life, personal experiences, memories, and reflections.",
		category: "non_fiction",
		subgenres: [
			{ name: "Personal Memoir", slug: "personal_memoir" },
			{ name: "Travel Memoir", slug: "travel_memoir" },
			{ name: "Celebrity Memoir", slug: "celebrity_memoir" },
			{ name: "Family Memoir", slug: "family_memoir" },
			{ name: "Coming-of-Age Memoir", slug: "coming_of_age_memoir" },
		],
	},

	{
		name: "Self-Help",
		slug: "self_help",
		description:
			"Books offering practical guidance for personal growth, habits, relationships, and everyday challenges.",
		category: "non_fiction",
		subgenres: [
			{ name: "Personal Development", slug: "personal_development" },
			{ name: "Productivity", slug: "productivity" },
			{ name: "Habits", slug: "habits" },
			{ name: "Motivation", slug: "motivation" },
			{ name: "Communication Skills", slug: "communication_skills" },
			{ name: "Emotional Intelligence", slug: "emotional_intelligence" },
			{ name: "Relationships", slug: "self_help_relationships" },
		],
	},

	{
		name: "History",
		slug: "history",
		description:
			"Nonfiction examining past events, civilizations, people, cultures, and historical change.",
		category: "non_fiction",
		subgenres: [
			{ name: "Ancient History", slug: "ancient_history" },
			{ name: "Medieval History", slug: "medieval_history" },
			{ name: "Modern History", slug: "modern_history" },
			{ name: "Military History", slug: "military_history" },
			{ name: "Social History", slug: "social_history" },
			{ name: "Cultural History", slug: "cultural_history" },
			{ name: "World History", slug: "world_history" },
			{ name: "Historical Revisionism", slug: "historical_revisionism" },
		],
	},

	{
		name: "True Crime",
		slug: "true_crime",
		description:
			"Nonfiction accounts of real criminal cases, investigations, perpetrators, and victims.",
		category: "non_fiction",
		subgenres: [
			{ name: "Serial Killers", slug: "serial_killers" },
			{ name: "Cold Cases", slug: "cold_cases" },
			{ name: "Forensic Investigation", slug: "forensic_investigation" },
			{ name: "Criminal Psychology", slug: "criminal_psychology" },
			{ name: "Unsolved Crimes", slug: "unsolved_crimes" },
			{ name: "Fraud & Scams", slug: "fraud_scams" },
		],
	},

	{
		name: "Business & Economics",
		slug: "business_economics",
		description:
			"Books about organizations, entrepreneurship, management, markets, and economic systems.",
		category: "non_fiction",
		subgenres: [
			{ name: "Entrepreneurship", slug: "entrepreneurship" },
			{ name: "Leadership", slug: "leadership" },
			{ name: "Management", slug: "management" },
			{ name: "Economics", slug: "economics" },
			{ name: "Marketing", slug: "marketing" },
			{ name: "Investing", slug: "business_investing" },
			{ name: "Business Strategy", slug: "business_strategy" },
		],
	},

	{
		name: "Philosophy",
		slug: "philosophy",
		description:
			"Works examining fundamental questions about existence, knowledge, ethics, reason, and reality.",
		category: "non_fiction",
		subgenres: [
			{ name: "Ethics", slug: "ethics" },
			{ name: "Existentialism", slug: "existentialism" },
			{ name: "Stoicism", slug: "stoicism" },
			{ name: "Metaphysics", slug: "metaphysics" },
			{ name: "Epistemology", slug: "epistemology" },
			{ name: "Political Philosophy", slug: "political_philosophy" },
			{ name: "Philosophy of Mind", slug: "philosophy_of_mind" },
		],
	},

	{
		name: "Psychology",
		slug: "psychology",
		description:
			"Nonfiction about human behavior, cognition, emotions, personality, and mental processes.",
		category: "non_fiction",
		subgenres: [
			{ name: "Cognitive Psychology", slug: "cognitive_psychology" },
			{ name: "Social Psychology", slug: "social_psychology" },
			{ name: "Behavioral Psychology", slug: "behavioral_psychology" },
			{ name: "Personality Psychology", slug: "personality_psychology" },
			{ name: "Developmental Psychology", slug: "developmental_psychology" },
			{ name: "Popular Psychology", slug: "popular_psychology" },
		],
	},

	{
		name: "Science",
		slug: "science",
		description:
			"Nonfiction explaining scientific discoveries, theories, natural phenomena, and research.",
		category: "non_fiction",
		subgenres: [
			{ name: "Physics", slug: "physics" },
			{ name: "Astronomy", slug: "astronomy" },
			{ name: "Biology", slug: "biology" },
			{ name: "Neuroscience", slug: "neuroscience" },
			{ name: "Mathematics", slug: "mathematics" },
			{ name: "Chemistry", slug: "chemistry" },
			{ name: "Evolution", slug: "evolution" },
			{ name: "Popular Science", slug: "popular_science" },
		],
	},

	{
		name: "Health & Fitness",
		slug: "health_fitness",
		description:
			"Nonfiction about physical health, exercise, nutrition, well-being, and healthy living.",
		category: "non_fiction",
		subgenres: [
			{ name: "Nutrition", slug: "nutrition" },
			{ name: "Strength Training", slug: "strength_training" },
			{ name: "Sports & Exercise", slug: "sports_exercise" },
			{ name: "Mental Wellness", slug: "mental_wellness" },
			{ name: "Sleep", slug: "sleep" },
			{ name: "Healthy Aging", slug: "healthy_aging" },
		],
	},

	{
		name: "Religion & Spirituality",
		slug: "religion_spirituality",
		description:
			"Nonfiction exploring religious traditions, spiritual practices, beliefs, and sacred texts.",
		category: "non_fiction",
		subgenres: [
			{ name: "Christianity", slug: "christianity" },
			{ name: "Islam", slug: "islam" },
			{ name: "Buddhism", slug: "buddhism" },
			{ name: "Hinduism", slug: "hinduism" },
			{ name: "Comparative Religion", slug: "comparative_religion" },
			{ name: "Mysticism", slug: "mysticism" },
			{ name: "Atheism & Secularism", slug: "atheism_secularism" },
		],
	},

	{
		name: "Politics & Society",
		slug: "politics_society",
		description:
			"Nonfiction about political systems, public policy, social structures, and collective behavior.",
		category: "non_fiction",
		subgenres: [
			{ name: "Political Theory", slug: "political_theory" },
			{ name: "International Relations", slug: "international_relations" },
			{ name: "Sociology", slug: "sociology" },
			{ name: "Anthropology", slug: "anthropology" },
			{ name: "Social Issues", slug: "social_issues" },
			{ name: "Geopolitics", slug: "geopolitics" },
			{ name: "Cultural Studies", slug: "cultural_studies" },
		],
	},

	{
		name: "Travel",
		slug: "travel",
		description:
			"Nonfiction about journeys, destinations, travel experiences, and the exploration of places.",
		category: "non_fiction",
		subgenres: [
			{ name: "Travel Writing", slug: "travel_writing" },
			{ name: "Travel Guides", slug: "travel_guides" },
			{ name: "Adventure Travel", slug: "adventure_travel" },
			{ name: "Cultural Travel", slug: "cultural_travel" },
			{ name: "Exploration & Discovery", slug: "exploration_discovery" },
		],
	},

	{
		name: "Personal Finance",
		slug: "personal_finance",
		description:
			"Books about managing money, budgeting, saving, investing, and building financial security.",
		category: "non_fiction",
		subgenres: [
			{ name: "Budgeting", slug: "budgeting" },
			{ name: "Saving Money", slug: "saving_money" },
			{ name: "Investing & Wealth", slug: "investing_wealth" },
			{ name: "Real Estate Finance", slug: "real_estate_finance" },
			{ name: "Retirement Planning", slug: "retirement_planning" },
			{ name: "Financial Independence", slug: "financial_independence" },
		],
	},

	{
		name: "Essays",
		slug: "essays",
		description:
			"Nonfiction prose presenting personal reflections, arguments, observations, or cultural criticism.",
		category: "non_fiction",
		subgenres: [
			{ name: "Personal Essays", slug: "personal_essays" },
			{ name: "Literary Essays", slug: "literary_essays" },
			{ name: "Cultural Criticism", slug: "cultural_criticism" },
			{ name: "Political Essays", slug: "political_essays" },
			{ name: "Collected Essays", slug: "collected_essays" },
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
