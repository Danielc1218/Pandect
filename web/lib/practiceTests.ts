/** One section of a test as bank_test_sections counts it (published questions only). */
export type SectionCount = { section_number: number; questions: number; passages: number };

/**
 * Whether a generated practice test is whole, shaped like a real one: Logical Reasoning sections 1 and 3 of 25
 * questions each and a Reading Comprehension section 2 of 4 passages. The practice list shows only these; questions
 * in the others still turn up in drills and random sections.
 */
export function isCompleteTest(sections: SectionCount[]) {
  const by = new Map(sections.map((s) => [s.section_number, s]));
  return sections.length === 3 && by.get(1)?.questions === 25 && by.get(2)?.passages === 4 && by.get(3)?.questions === 25;
}

/**
 * Whether a fixed section can be started (and so offered): it has published questions, and in the generated bank its
 * test is complete. The old one-section generated tests (GEN-LR, GEN-RC) are empty now, so their results offer no retake.
 */
export function canStartSection(sections: (SectionCount & { test_id: string })[], bank: string, testId: string, sectionNumber: number) {
  const mine = sections.filter((s) => s.test_id === testId);
  return mine.some((s) => s.section_number === sectionNumber) && (bank !== "generated" || isCompleteTest(mine));
}
