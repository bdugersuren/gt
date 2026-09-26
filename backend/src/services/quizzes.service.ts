import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, CBTStatus, QuestionType } from '@prisma/client';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  // Create a new question in the course question bank
  async createQuestion(data: {
    text: string; type: QuestionType; options?: Array<{ value: string; matchValue?: string; isCorrect?: boolean; order?: number }>;
    optionsJson?: any; correctAnswer?: string; explanation?: string; points?: number; courseId: string;
  }) {
    if (!(await this.prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }))) throw new NotFoundException('Хичээл олдсонгүй');
    const legacyOptions = Array.isArray(data.optionsJson) ? data.optionsJson : [];
    const options = data.options?.length ? data.options : legacyOptions.map((item: any, index: number) => ({ value: typeof item === 'string' ? item : String(item.value ?? item.text ?? ''), isCorrect: typeof item === 'object' ? Boolean(item.isCorrect) : data.correctAnswer === item, order: index + 1 }));
    return this.prisma.question.create({
      data: {
        text: data.text, type: data.type, explanation: data.explanation, points: data.points ?? 1, courseId: data.courseId,
        options: options.length ? { create: options.map((option, index) => ({ value: option.value, matchValue: option.matchValue, isCorrect: Boolean(option.isCorrect), order: option.order ?? index + 1 })) } : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  // Create a new Quiz under a lesson and link questions
  async createQuiz(data: {
    title: string;
    timeLimitMin: number;
    passScore: number;
    lessonId: string;
    questionIds: string[];
  }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: data.lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Лекц олдсонгүй');
    }

    if (data.questionIds.length === 0) {
      throw new BadRequestException('Тестэнд хамгийн багадаа нэг асуулт сонгосон байх ёстой');
    }

    // Verify all question IDs exist
    const dbQuestions = await this.prisma.question.findMany({
      where: { id: { in: data.questionIds } },
    });

    if (dbQuestions.length !== data.questionIds.length) {
      throw new BadRequestException('Массивт хүчингүй асуултын ID-ууд байна');
    }

    // Create the Quiz and link questions in transaction
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: data.title,
          timeLimitMin: data.timeLimitMin,
          passScore: data.passScore,
          lessonId: data.lessonId,
        },
      });

      // Link questions with order sequence
      const links = data.questionIds.map((questionId, index) => ({
        quizId: quiz.id,
        questionId,
        order: index + 1,
      }));

      await tx.quizQuestion.createMany({
        data: links,
      });

      return quiz;
    });
  }

  // Find quiz details (scrubbing correct answers for student users)
  async findOne(quizId: string, roles: Role[]) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { lesson: { include: { module: { select: { courseId: true } } } }, quizQuestions: { include: { question: { include: { options: { orderBy: { order: 'asc' } } } } }, orderBy: { order: 'asc' } } } });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');
    if (!roles.includes(Role.STUDENT)) return quiz;
    return { ...quiz, quizQuestions: quiz.quizQuestions.map((qq) => ({ ...qq, question: { ...qq.question, options: qq.question.options.map(({ isCorrect: _isCorrect, ...option }) => option) } })) };
  }

  // Grade student quiz attempt automatically
  async submitAttempt(quizId: string, studentId: string, answers: Array<{ questionId: string; answerText?: string; selectedOptionIds?: string[] }> | Record<string, string>) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { lesson: { include: { module: { select: { courseId: true } } } }, quizQuestions: { include: { question: { include: { options: true } } } } } });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        AND: [{ OR: [{ standaloneCourseId: quiz.lesson.module.courseId }, { curriculumItem: { courseId: quiz.lesson.module.courseId } }] }],
      },
    });
    if (!enrollment) throw new BadRequestException('Та энэ курст идэвхтэй бүртгэлгүй байна');
    const attemptNo = (await this.prisma.quizAttempt.count({ where: { quizId, studentId } })) + 1;
    if (quiz.maxAttempts && attemptNo > quiz.maxAttempts) throw new BadRequestException('Тест өгөх оролдлогын дээд хязгаарт хүрсэн байна');
    const answerRows: Array<{ questionId: string; answerText?: string; selectedOptionIds?: string[] }> = Array.isArray(answers) ? answers : Object.entries(answers).map(([questionId, answerText]) => ({ questionId, answerText }));
    let scoreEarned = 0; let totalMaxPoints = 0;
    const gradingDetails: Array<{ questionId: string; text: string; studentAnswer: string; correctAnswer: string; isCorrect: boolean; pointsEarned: number }> = [];
    const evaluated = quiz.quizQuestions.map(({ question }) => {
      const input = answerRows.find((row) => row.questionId === question.id);
      const selectedIds = input?.selectedOptionIds ?? [];
      const selectedValues = selectedIds.length ? question.options.filter((option) => selectedIds.includes(option.id)).map((option) => option.value) : input?.answerText ? [input.answerText.trim()] : [];
      const correctValues = question.options.filter((option) => option.isCorrect).map((option) => option.value);
      const normalized = (values: string[]) => values.map((value) => value.trim().toLowerCase()).sort();
      const isCorrect = normalized(selectedValues).join('|') === normalized(correctValues).join('|') && correctValues.length > 0;
      const pointsEarned = isCorrect ? question.points : 0;
      scoreEarned += pointsEarned; totalMaxPoints += question.points;
      const studentAnswer = selectedValues.join(', '); const correctAnswer = correctValues.join(', ');
      gradingDetails.push({ questionId: question.id, text: question.text, studentAnswer, correctAnswer, isCorrect, pointsEarned });
      return { questionId: question.id, answerText: studentAnswer || null, answerJson: selectedIds.length ? selectedIds : undefined, isCorrect, scoreEarned: pointsEarned };
    });
    const scorePercentage = totalMaxPoints > 0 ? (scoreEarned / totalMaxPoints) * 100 : 0;
    const passed = scorePercentage >= quiz.passScore; const cbtResult = passed ? CBTStatus.COMPETENT : CBTStatus.NOT_YET_COMPETENT;
    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({ data: { quizId, studentId, attemptNo, score: scorePercentage, passed, cbtResult, completedAt: new Date() } });
      await tx.quizAnswer.createMany({ data: evaluated.map((answer) => ({ ...answer, attemptId: created.id, studentId })) });
      return created;
    });
    return { attemptId: attempt.id, score: scorePercentage, passed, cbtResult, gradingDetails, startedAt: attempt.startedAt, completedAt: attempt.completedAt };
  }

  // Get all questions in the question bank of a course
  async findQuestionsByCourse(courseId: string) {
    return this.prisma.question.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update a question in the question bank
  async updateQuestion(id: string, data: { text?: string; type?: QuestionType; options?: Array<{ value: string; matchValue?: string; isCorrect?: boolean; order?: number }>; optionsJson?: any; correctAnswer?: string; explanation?: string; points?: number }) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Асуулт олдсонгүй');
    const legacyOptions = Array.isArray(data.optionsJson) ? data.optionsJson : [];
    const options = data.options ?? legacyOptions.map((item: any, index: number) => ({ value: typeof item === 'string' ? item : String(item.value ?? item.text ?? ''), isCorrect: typeof item === 'object' ? Boolean(item.isCorrect) : data.correctAnswer === item, order: index + 1 }));
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({ where: { id }, data: { text: data.text, type: data.type, explanation: data.explanation, points: data.points } });
      if (options.length) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({ data: options.map((option, index) => ({ questionId: id, value: option.value, matchValue: option.matchValue, isCorrect: Boolean(option.isCorrect), order: option.order ?? index + 1 })) });
      }
      return tx.question.findUnique({ where: { id: updated.id }, include: { options: { orderBy: { order: 'asc' } } } });
    });
  }

  // Delete a question from the question bank
  async deleteQuestion(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Асуулт олдсонгүй');
    return this.prisma.question.delete({ where: { id } });
  }

  // Update quiz metadata and optionally replace question list
  async updateQuiz(id: string, data: {
    title?: string;
    timeLimitMin?: number;
    passScore?: number;
    questionIds?: string[];
  }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');

    return this.prisma.$transaction(async (tx) => {
      // Update basic fields
      const updated = await tx.quiz.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.timeLimitMin !== undefined && { timeLimitMin: data.timeLimitMin }),
          ...(data.passScore !== undefined && { passScore: data.passScore }),
        },
      });

      // Replace questions if provided
      if (data.questionIds && data.questionIds.length > 0) {
        const dbQuestions = await tx.question.findMany({
          where: { id: { in: data.questionIds } },
        });
        if (dbQuestions.length !== data.questionIds.length) {
          throw new BadRequestException('Массивт хүчингүй асуултын ID-ууд байна');
        }
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
        await tx.quizQuestion.createMany({
          data: data.questionIds.map((questionId, index) => ({
            quizId: id,
            questionId,
            order: index + 1,
          })),
        });
      }

      return updated;
    });
  }

  // Delete a quiz and its question links
  async deleteQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');
    return this.prisma.quiz.delete({ where: { id } });
  }

  // Get all attempts for a quiz (Teacher view with statistics)
  async getQuizAttempts(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          include: {
            student: { select: { id: true, fullName: true, code: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');

    const attempts = quiz.attempts;
    const totalAttempts = attempts.length;
    const passed = attempts.filter((a) => a.passed).length;
    const avgScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / totalAttempts
      : 0;

    return {
      quizId,
      totalAttempts,
      passedCount: passed,
      failedCount: totalAttempts - passed,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
      attempts: attempts.map((a) => ({
        id: a.id,
        student: a.student,
        score: Math.round((a.score ?? 0) * 10) / 10,
        passed: a.passed,
        cbtResult: a.cbtResult,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      })),
    };
  }

  async getMyAttempts(quizId: string, studentId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true, maxAttempts: true, lesson: { select: { module: { select: { courseId: true } } } } } });
    if (!quiz) throw new NotFoundException('Тест олдсонгүй');
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        AND: [{ OR: [{ standaloneCourseId: quiz.lesson.module.courseId }, { curriculumItem: { courseId: quiz.lesson.module.courseId } }] }],
      },
    });
    if (!enrollment) throw new BadRequestException('Та энэ курст идэвхтэй бүртгэлгүй байна');
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      include: { answers: true },
      orderBy: { attemptNo: 'desc' },
    });
    return { maxAttempts: quiz.maxAttempts, remainingAttempts: quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - attempts.length) : null, attempts };
  }

}

