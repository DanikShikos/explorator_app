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

    expect(quiz.questions[0]).toMatchObject({
      question: "What is 2 + 2?",
      options: ["3", "4"],
      answer: "4",
      explanation: "None",
    });
  });
});