// Pure, server-side gradebook aggregation. Shared by the teacher course
// gradebook and the student "my gradebook" endpoints so the calculation lives
// in exactly one place and is trivially unit-testable (accepts plain objects).
//
// Rules (see spec):
//   * Gradable task = Content of type "task" with a valid non-negative maxScore.
//   * possiblePoints = sum of maxScore over ALL gradable tasks.
//   * earnedPoints  = sum of grade over GRADED submissions only.
//   * Per task, per student status:
//       - no submission                          -> "not_submitted" (0 earned)
//       - submission not graded / grade null     -> "ungraded"      (0 earned)
//       - submission graded (grade is a number)  -> "graded"        (grade earned)
//     grade === 0 is a legitimate graded score; only null/undefined is ungraded.
//   * percentage = possiblePoints === 0 ? null : round2(earned / possible * 100).
//   * A malformed grade (grade < 0 or grade > maxScore) is surfaced with an
//     `invalid` flag and clamped for the aggregate so the percentage stays valid
//     rather than silently producing an impossible value.

const idStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const isValidMaxScore = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isGradedNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const buildGradebook = ({ tasks = [], submissions = [], students = [] } = {}) => {
  // Only genuine, gradable tasks participate.
  const gradableTasks = tasks.filter(
    (t) => (t.type === undefined || t.type === 'task') && isValidMaxScore(t.maxScore)
  );

  const taskDefs = gradableTasks.map((t) => ({
    id: idStr(t._id),
    title: t.title,
    maxScore: t.maxScore,
    dueDate: t.dueDate || null,
  }));

  // Index submissions by "taskId::studentId" for O(1) lookup.
  const subMap = new Map();
  submissions.forEach((s) => {
    subMap.set(`${idStr(s.task)}::${idStr(s.student)}`, s);
  });

  const possiblePoints = round2(gradableTasks.reduce((sum, t) => sum + t.maxScore, 0));

  const rows = students.map((student) => {
    let earnedPoints = 0;
    let hasInvalidGrade = false;

    const taskCells = gradableTasks.map((t) => {
      const taskId = idStr(t._id);
      const submission = subMap.get(`${taskId}::${idStr(student._id)}`);

      if (!submission) {
        return { taskId, status: 'not_submitted', grade: null, feedback: '' };
      }

      const graded = submission.status === 'graded' && isGradedNumber(submission.grade);

      if (!graded) {
        return {
          taskId,
          status: 'ungraded',
          grade: null,
          feedback: submission.feedback || '',
        };
      }

      // Graded. grade === 0 is a real score and contributes 0 (not "ungraded").
      let contribution = submission.grade;
      let invalid = false;
      if (submission.grade < 0 || submission.grade > t.maxScore) {
        invalid = true;
        hasInvalidGrade = true;
        // Clamp only the aggregate contribution; the raw grade is still surfaced.
        contribution = Math.min(Math.max(submission.grade, 0), t.maxScore);
      }
      earnedPoints += contribution;

      const cell = {
        taskId,
        status: 'graded',
        grade: submission.grade,
        feedback: submission.feedback || '',
      };
      if (invalid) cell.invalid = true;
      return cell;
    });

    earnedPoints = round2(earnedPoints);
    const percentage = possiblePoints === 0 ? null : round2((earnedPoints / possiblePoints) * 100);

    return {
      id: idStr(student._id),
      name: student.name,
      studentId: student.studentId,
      earnedPoints,
      possiblePoints,
      percentage,
      hasInvalidGrade,
      tasks: taskCells,
    };
  });

  return { tasks: taskDefs, rows, possiblePoints };
};

module.exports = { buildGradebook };
