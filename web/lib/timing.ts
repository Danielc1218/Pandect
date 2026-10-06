/**
 * Minutes allowed for a timed section. A real section is 24 to 28 questions in 35 minutes; longer sets
 * (not laid out as test sections) get the same pace, 1.4 minutes a question.
 */
export const sectionMinutes = (questions: number) => (questions <= 28 ? 35 : Math.round(questions * 1.4));
