/** How question text is shown. The stored text stays as written; these only change what the page displays. */

/** Some sets type a dash as a spaced double hyphen ("deliver -- short journeys"); show it as an em dash. */
export const typeset = (text: string) => text.replace(/\s+--\s+/g, "—");
