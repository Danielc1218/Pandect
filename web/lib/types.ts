/** What each question type asks, in a line, for the type lists and the top of a type's drill. */
const LR: Record<string, string> = {
  "Cannot Be True": "Find the one claim the passage rules out.",
  "Complete the Argument": "Fill in the blank with what the argument leads to.",
  "Evaluate the Argument": "Find the question whose answer would most help judge the argument.",
  Flaw: "Name the mistake in the argument's reasoning.",
  "Main Conclusion": "Find the claim the rest of the argument is there to support.",
  "Method of Reasoning": "Describe how the argument makes its case.",
  Misinterpretation: "Spot how the second speaker misreads the first.",
  "Most Strongly Supported": "Pick the claim the passage backs best, even if not with certainty.",
  "Must Be True": "Pick the claim that has to follow from the passage.",
  "Necessary Assumption": "Find what the argument needs to be true to work.",
  "Parallel Flaw": "Match the argument that makes the same mistake.",
  "Parallel Reasoning": "Match the argument with the same structure.",
  "Point at Issue": "Find what the two speakers disagree about.",
  Principle: "Find the general rule that matches or justifies the reasoning.",
  "Resolve/Explain": "Find what explains an apparent contradiction.",
  "Role of a Statement": "Say what part one claim plays in the argument.",
  Strengthen: "Find the new fact that most supports the argument.",
  "Sufficient Assumption": "Find the claim that, added, makes the conclusion follow.",
  Weaken: "Find the new fact that most undermines the argument.",
};
const RC: Record<string, string> = {
  Analogy: "Find the situation most like one in the passage.",
  "Author's Attitude": "Read the author's tone or stance toward a subject.",
  Detail: "Find what the passage says outright.",
  Inference: "Work out what the passage implies without saying.",
  "Main Idea": "Sum up the passage's central point.",
  Organization: "Describe how the passage or a paragraph is built.",
  Purpose: "Say why the author included a word, example or paragraph.",
  Strengthen: "Find what would most support a view in the passage.",
  Weaken: "Find what would most undermine a view in the passage.",
};

export const describeType = (section: string, type: string): string | undefined =>
  (section === "Reading Comprehension" ? RC : LR)[type];
