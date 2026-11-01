/**
 * Minutes allowed for a timed section. A section is 24 to 28 questions in 35 minutes; longer sets get the same
 * pace, 1.4 minutes a question.
 */
export const sectionMinutes = (questions: number) => (questions <= 28 ? 35 : Math.round(questions * 1.4));
