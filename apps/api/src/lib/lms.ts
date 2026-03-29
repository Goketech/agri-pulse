export interface GradeResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  passed: boolean;
  invalidAnswers: number;
}

export function gradeQuizAttempt(
  correctIndexes: number[],
  answers: number[],
  passingScore: number,
): GradeResult {
  if (correctIndexes.length === 0) {
    return { correctCount: 0, totalQuestions: 0, score: 0, passed: false, invalidAnswers: 0 };
  }

  let correctCount = 0;
  let invalidAnswers = 0;
  for (let i = 0; i < correctIndexes.length; i += 1) {
    const selected = answers[i];
    if (!Number.isInteger(selected) || selected < 0) {
      invalidAnswers += 1;
      continue;
    }
    if (selected === correctIndexes[i]) correctCount += 1;
  }

  const score = Math.round((correctCount / correctIndexes.length) * 100);
  return {
    correctCount,
    totalQuestions: correctIndexes.length,
    score,
    passed: score >= passingScore,
    invalidAnswers,
  };
}

export function calculateLessonProgress(currentLesson: number, totalLessons: number): number {
  if (totalLessons <= 0) return 0;
  const bounded = Math.max(0, Math.min(currentLesson, totalLessons));
  return Math.round((bounded / totalLessons) * 80);
}
