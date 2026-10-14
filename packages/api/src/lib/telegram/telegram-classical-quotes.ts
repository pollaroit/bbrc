/** Short quotes for /ping (classical & canonical literature). */
export const TELEGRAM_CLASSICAL_QUOTES: readonly string[] = [
	'"It is a truth universally acknowledged…" — Jane Austen, Pride and Prejudice',
	'"Call me Ishmael." — Herman Melville, Moby-Dick',
	'"All happy families are alike…" — Leo Tolstoy, Anna Karenina',
	'"It was the best of times, it was the worst of times…" — Charles Dickens, A Tale of Two Cities',
	'"Beware; for I am fearless, and therefore powerful." — Mary Shelley, Frankenstein',
	'"Reader, I married him." — Charlotte Brontë, Jane Eyre',
	'"We are such stuff as dreams are made on…" — William Shakespeare, The Tempest',
	'"Not all those who wander are lost." — J.R.R. Tolkien, The Fellowship of the Ring',
	'"So we beat on, boats against the current…" — F. Scott Fitzgerald, The Great Gatsby',
	'"Whatever our souls are made of, his and mine are the same." — Emily Brontë, Wuthering Heights',
	'"I am no bird; and no net ensnares me." — Charlotte Brontë, Jane Eyre',
	'"The only way to get rid of a temptation is to yield to it." — Oscar Wilde, The Picture of Dorian Gray',
	'"There are darknesses in life and there are lights, and you are one of the lights." — Bram Stoker, Dracula',
	'"I am not afraid of storms, for I am learning how to sail my ship." — Louisa May Alcott, Little Women',
	'"It is a far, far better thing that I do…" — Charles Dickens, A Tale of Two Cities',
	'"To be, or not to be: that is the question." — William Shakespeare, Hamlet',
	'"Abandon all hope, ye who enter here." — Dante Alighieri, Inferno',
	'"Don Quixote: When life itself seems lunatic, who knows where madness lies?" — Miguel de Cervantes, Don Quixote',
	'"It is a tale full of sound and fury, signifying nothing." — William Shakespeare, Macbeth',
	'"I have not broken your heart—you have broken it; and in breaking it, you have broken mine." — Emily Brontë, Wuthering Heights',
];

export function pickRandomClassicalQuote(): string {
	const index = Math.floor(Math.random() * TELEGRAM_CLASSICAL_QUOTES.length);
	return TELEGRAM_CLASSICAL_QUOTES[index] ?? "Pong.";
}
