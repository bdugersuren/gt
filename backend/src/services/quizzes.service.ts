import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, CBTStatus, QuestionType } from '@prisma/client';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  // Create a new question in the course question bank
  async createQuestion(data: {
    text: string;
    type: QuestionType;
    optionsJson: any;
    correctAnswer: string;
    explanation?: string;
    points?: number;
    courseId: string;
  }) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
    }

    return this.prisma.question.create({
      data: {
        text: data.text,
        type: data.type,
        optionsJson: data.optionsJson,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        points: data.points ?? 1.0,
        courseId: data.courseId,
      },
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
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        quizQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Тест олдсонгүй');
    }

    // Security: Remove correct answers and explanations for students viewing the quiz
    if (roles.includes(Role.STUDENT)) {
      const sanitizedQuestions = quiz.quizQuestions.map((qq) => {
        const { correctAnswer, explanation, ...rest } = qq.question;
        return {
          ...qq,
          question: rest,
        };
      });

      return {
        ...quiz,
        quizQuestions: sanitizedQuestions,
      };
    }

    return quiz;
  }

  // Grade student quiz attempt automatically
  async submitAttempt(
    quizId: string,
    studentId: string,
    answersJson: Record<string, string>,
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        quizQuestions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Тест олдсонгүй');
    }

    let scoreEarned = 0;
    let totalMaxPoints = 0;
    const gradingDetails: Array<{
      questionId: string;
      text: string;
      studentAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      pointsEarned: number;
    }> = [];

    // Evaluate each question
    for (const qq of quiz.quizQuestions) {
      const question = qq.question;
      const studentAnswer = (answersJson[question.id] || '').trim();
      const correctAnswer = question.correctAnswer.trim();
      
      let isCorrect = false;

      if (question.type === QuestionType.SHORT_ANSWER) {
        // Case-insensitive matching for short text answers
        isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
      } else {
        // Exact matching for MCQ, True/False, Matching
        isCorrect = studentAnswer === correctAnswer;
      }

      const pointsEarned = isCorrect ? question.points : 0;
      scoreEarned += pointsEarned;
      totalMaxPoints += question.points;

      gradingDetails.push({
        questionId: question.id,
        text: question.text,
        studentAnswer,
        correctAnswer,
        isCorrect,
        pointsEarned,
      });
    }

    // Calculate score percentage (out of 100)
    const scorePercentage = totalMaxPoints > 0 ? (scoreEarned / totalMaxPoints) * 100 : 0;
    const passed = scorePercentage >= quiz.passScore;
    const cbtResult = passed ? CBTStatus.COMPETENT : CBTStatus.NOT_YET_COMPETENT;

    // Create the QuizAttempt log
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        score: scorePercentage,
        passed,
        cbtResult,
        answersJson: answersJson as any,
      },
    });

    return {
      attemptId: attempt.id,
      score: scorePercentage,
      passed,
      cbtResult,
      gradingDetails,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
    };
  }

  // Get all questions in the question bank of a course
  async findQuestionsByCourse(courseId: string) {
    return this.prisma.question.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update a question in the question bank
  async updateQuestion(id: string, data: {
    text?: string;
    type?: any;
    optionsJson?: any;
    correctAnswer?: string;
    explanation?: string;
    points?: number;
  }) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Асуулт олдсонгүй');
    return this.prisma.question.update({ where: { id }, data });
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
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
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
        score: Math.round(a.score * 10) / 10,
        passed: a.passed,
        cbtResult: a.cbtResult,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      })),
    };
  }
}

