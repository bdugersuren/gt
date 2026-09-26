import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../../.env') });
import { PrismaClient, Prisma } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const output = process.argv[2];

function parseJson(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) return { present: false, valid: true };
  return { present: true, valid: true };
}

async function main() {
  const [registerDuplicates, academicYearDuplicates, programDuplicates, incompleteClasses, membershipDuplicates, questions, attempts, vacancies, submissions, enrollments] = await Promise.all([
    prisma.user.groupBy({ by: ['registerNumber'], where: { registerNumber: { not: null } }, _count: { registerNumber: true }, having: { registerNumber: { _count: { gt: 1 } } } }),
    prisma.academicYear.groupBy({ by: ['name'], _count: { name: true }, having: { name: { _count: { gt: 1 } } } }),
    prisma.program.groupBy({ by: ['code', 'qualificationLevel', 'durationMonths'], _count: { code: true }, having: { code: { _count: { gt: 1 } } } }),
    prisma.classGroup.findMany({ where: { OR: [{ programId: null }, { academicYearId: null }] }, select: { id: true, code: true, programId: true, academicYearId: true } }),
    prisma.studentClassMembership.groupBy({ by: ['studentId', 'classGroupId', 'startDate'], _count: { id: true }, having: { id: { _count: { gt: 1 } } } }),
    prisma.question.findMany({ where: { optionsJson: { not: Prisma.JsonNull } }, select: { id: true, optionsJson: true } }),
    prisma.quizAttempt.findMany({ where: { answersJson: { not: Prisma.JsonNull } }, select: { id: true, answersJson: true } }),
    prisma.jobVacancy.findMany({ where: { skillsReq: { not: Prisma.JsonNull } }, select: { id: true, skillsReq: true } }),
    prisma.submission.findMany({ where: { OR: [{ fileUrl: { not: null } }, { hlsStreamUrl: { not: null } }, { linkUrl: { not: null } }] }, select: { id: true, fileUrl: true, hlsStreamUrl: true, linkUrl: true } }),
    prisma.enrollment.findMany({ where: { OR: [{ source: 'CURRICULUM', curriculumItemId: null }, { source: 'STANDALONE', standaloneCourseId: null }, { profileStudentId: null, studentId: null }] }, select: { id: true, source: true, curriculumItemId: true, standaloneCourseId: true, profileStudentId: true, studentId: true } }),
  ]);

  const parseErrors = {
    questions: questions.filter((row) => { try { return !Array.isArray(row.optionsJson) && typeof row.optionsJson !== 'object'; } catch { return true; } }).map((row) => row.id),
    quizAttempts: attempts.filter((row) => { try { return typeof row.answersJson !== 'object'; } catch { return true; } }).map((row) => row.id),
    vacancies: vacancies.filter((row) => { try { return !Array.isArray(row.skillsReq); } catch { return true; } }).map((row) => row.id),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    duplicates: { registerNumber: registerDuplicates, academicYear: academicYearDuplicates, program: programDuplicates, classMembership: membershipDuplicates },
    missingRequiredRelations: { classGroups: incompleteClasses, enrollments },
    parseErrors,
    media: { submissionsWithLegacyUrl: submissions.length, emptyUrlRows: submissions.filter((row) => !row.fileUrl && !row.hlsStreamUrl && !row.linkUrl).map((row) => row.id) },
    summary: { registerDuplicates: registerDuplicates.length, academicYearDuplicates: academicYearDuplicates.length, programDuplicates: programDuplicates.length, incompleteClassGroups: incompleteClasses.length, membershipDuplicates: membershipDuplicates.length, invalidQuestionOptions: parseErrors.questions.length, invalidQuizAnswers: parseErrors.quizAttempts.length, invalidVacancySkills: parseErrors.vacancies.length, submissionsWithLegacyUrl: submissions.length, invalidEnrollments: enrollments.length },
  };
  const json = JSON.stringify(report, null, 2);
  if (output) await writeFile(output, json + '\n');
  console.log(json);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
