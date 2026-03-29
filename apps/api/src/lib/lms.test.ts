import test from "node:test";
import assert from "node:assert/strict";
import { calculateLessonProgress, gradeQuizAttempt } from "./lms";

test("gradeQuizAttempt computes score and pass correctly", () => {
  const result = gradeQuizAttempt([1, 0, 2, 3], [1, 0, 2, 1], 70);
  assert.equal(result.correctCount, 3);
  assert.equal(result.totalQuestions, 4);
  assert.equal(result.score, 75);
  assert.equal(result.passed, true);
});

test("gradeQuizAttempt handles invalid answers", () => {
  const result = gradeQuizAttempt([1, 2, 0], [1, -1, 8], 60);
  assert.equal(result.correctCount, 1);
  assert.equal(result.invalidAnswers, 1);
  assert.equal(result.score, 33);
  assert.equal(result.passed, false);
});

test("calculateLessonProgress caps between 0 and 80", () => {
  assert.equal(calculateLessonProgress(0, 4), 0);
  assert.equal(calculateLessonProgress(2, 4), 40);
  assert.equal(calculateLessonProgress(4, 4), 80);
  assert.equal(calculateLessonProgress(10, 4), 80);
});
