/* ============================ storage ============================ */
export const KEY = "numo.math.club.v1";
// What a reward cost back when they were all one flat price. Only load()'s
// migration needs it, so it lives here beside the key rather than among the
// prize tables — those get rewritten, and it kept getting deleted with them.
export const PER_STICKER = 25;
