import { describe, expect, it } from "vitest";
import { generatedQuizSchema, sanitizeGeneratedQuiz } from "./quiz-schema";

const validQuestion = {
  type: "multiple_choice" as const,
  question: "What is 2 + 2?",
  options: ["3", "4"],
  answer: "4",
  explanation: null,
};

describe("generatedQuizSchema", () => {
  it("accepts a valid quiz", () => {
    expect(generatedQuizSchema.safeParse({ questions: [validQuestion] }).success).toBe(true);
  });

  it("accepts open-ended questions without options", () => {
    const question = { ...validQuestion, type: "open_ended", options: null };

    expect(generatedQuizSchema.safeParse({ questions: [question] }).success).toBe(true);
  });

  it("rejects questions with empty required text", () => {
    const question = { ...validQuestion, question: "" };

    expect(generatedQuizSchema.safeParse({ questions: [question] }).success).toBe(false);
  });

  it("enforces quiz and multiple-choice option limits", () => {
    const tooManyQuestions = Array.from({ length: 13 }, () => validQuestion);
    const tooFewOptions = { ...validQuestion, options: ["only one"] };

    expect(generatedQuizSchema.safeParse({ questions: tooManyQuestions }).success).toBe(false);
    expect(generatedQuizSchema.safeParse({ questions: [tooFewOptions] }).success).toBe(false);
  });

  it("removes null bytes from generated text and revalidates it", () => {
    const quiz = sanitizeGeneratedQuiz({
      questions: [{
        ...validQuestion,
        question: "What\0 is 2 + 2?",
        options: ["3\0", "4"],
        answer: "4\0",
        explanation: "None\0",
      }],
    });

    expect(quiz).not.toBeNull();
    expect(quiz!.questions[0]).toMatchObject({
      question: "What is 2 + 2?",
      options: ["3", "4"],
      answer: "4",
      explanation: "None",
    });
  });

  it("rejects truncated / empty AI payloads without throwing", () => {
    expect(generatedQuizSchema.safeParse(null).success).toBe(false);
    expect(generatedQuizSchema.safeParse({}).success).toBe(false);
    expect(generatedQuizSchema.safeParse({ questions: [] }).success).toBe(false);
    expect(generatedQuizSchema.safeParse({ questions: "truncated" }).success).toBe(false);
  });

  it("rejects open-ended answers longer than four words", () => {
    const question = {
      ...validQuestion,
      type: "open_ended" as const,
      options: null,
      answer: "one two three four five",
    };
    expect(generatedQuizSchema.safeParse({ questions: [question] }).success).toBe(false);
  });

  it("rejects broken JSON fixture strings without throwing (safeParse)", () => {
    const fixtures = [
      "",
      '{"questions":[{"type":"multiple_choice","question":"Q?","options":["3","4"],"answer":',
      "```json\n{\"questions\":[]}\n```",
      '{"questions":[{"type":"multiple_choice","question":"Q?","options":["3","4",],"answer":"4",}],}',
    ];
    for (const raw of fixtures) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        expect(generatedQuizSchema.safeParse(undefined).success).toBe(false);
        continue;
      }
      expect(generatedQuizSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects wrong types and empty questions; strips extra fields on valid shapes", () => {
    expect(
      generatedQuizSchema.safeParse({
        questions: [{ ...validQuestion, type: "true_false" }],
      }).success,
    ).toBe(false);
    expect(
      generatedQuizSchema.safeParse({
        questions: [{ ...validQuestion, options: "not-an-array" }],
      }).success,
    ).toBe(false);

    const withExtras = {
      questions: [{ ...validQuestion, modelNote: "ignore", confidence: 0.9 }],
      meta: { provider: "fake" },
    };
    const parsed = generatedQuizSchema.safeParse(withExtras);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("meta");
      expect(parsed.data.questions[0]).not.toHaveProperty("modelNote");
    }
  });

  it("rejects multiple_choice whose answer is not in options", () => {
    const hallucinated = {
      ...validQuestion,
      options: ["3", "4"],
      answer: "zebra",
    };
    expect(generatedQuizSchema.safeParse({ questions: [hallucinated] }).success).toBe(false);
  });

  it("sanitizeGeneratedQuiz returns null when null-byte-only text collapses to empty", () => {
    expect(
      sanitizeGeneratedQuiz({
        questions: [{ ...validQuestion, question: "\0", answer: "4" }],
      }),
    ).toBeNull();
  });
});
