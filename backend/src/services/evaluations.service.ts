import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluateSubmissionDto } from '../evaluations/dto/evaluate-submission.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  // Evaluate student assignment submission using rubric criteria matrix
  async evaluateSubmission(
    submissionId: string,
    evaluatorId: string,
    data: EvaluateSubmissionDto,
  ) {
    // 1. Fetch submission with its assignment and rubrics
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            rubrics: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Даалгавар илгээлт олдсонгүй');
    }

    const rubrics = submission.assignment.rubrics;
    const allCriteria = rubrics.flatMap((r) => r.criteria);
    const criteriaMap = new Map(allCriteria.map((c) => [c.id, c]));

    // 2. Validate that all submitted criteria exist in the assignment rubrics
    for (const scoreInput of data.criteriaScores) {
      if (!criteriaMap.has(scoreInput.criteriaId)) {
        throw new BadRequestException(
          `Шалгуур ID ${scoreInput.criteriaId} нь уг даалгаврын рубрикийн шалгуурт хамааралгүй байна`
        );
      }
      
      const criteria = criteriaMap.get(scoreInput.criteriaId);
      if (criteria && scoreInput.scoreEarned > criteria.points) {
        throw new BadRequestException(
          `Шалгуур ${criteria.description} оноо хамгийн ихдээ ${criteria.points} байх ёстой. Earned: ${scoreInput.scoreEarned}`
        );
      }
    }

    // 3. Save rubric scores in database transaction
    return this.prisma.$transaction(async (tx) => {
      // Upsert RubricScore for each criteria graded
      for (const scoreInput of data.criteriaScores) {
        // Look for existing rubric score for this submission
        const existingScore = await tx.rubricScore.findFirst({
          where: {
            submissionId,
            criteriaId: scoreInput.criteriaId,
          },
        });

        if (existingScore) {
          await tx.rubricScore.update({
            where: { id: existingScore.id },
            data: {
              scoreEarned: scoreInput.scoreEarned,
              evaluatorId,
            },
          });
        } else {
          await tx.rubricScore.create({
            data: {
              submissionId,
              criteriaId: scoreInput.criteriaId,
              scoreEarned: scoreInput.scoreEarned,
              evaluatorId,
            },
          });
        }
      }

      // 4. Calculate overall percentage score
      let totalMaxPoints = 0;
      let totalEarnedPoints = 0;

      // Map criteria inputs to calculate earned sums
      const scoreInputsMap = new Map(data.criteriaScores.map((s) => [s.criteriaId, s.scoreEarned]));

      for (const criteria of allCriteria) {
        totalMaxPoints += criteria.points;
        // If teacher evaluated this criteria, add to sum, else 0
        totalEarnedPoints += scoreInputsMap.get(criteria.id) || 0;
      }

      const finalPercentageScore = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;

      // 5. Update submission record with score, feedback, and CBT Status
      return tx.submission.update({
        where: { id: submissionId },
        data: {
          score: finalPercentageScore,
          cbtResult: data.cbtResult,
          feedback: data.feedback,
        },
        include: {
          rubricScores: {
            include: {
              criteria: true,
            },
          },
        },
      });
    });
  }

  // Get student submissions for teachers or mentors
  async getSubmissions(userId: string, activeRole: string) {
    if (activeRole === 'TEACHER') {
      return this.prisma.submission.findMany({
        where: {
          assignment: {
            lesson: {
              module: {
                course: {
                  teachers: {
                    some: { id: userId },
                  },
                },
              },
            },
          },
        },
        include: {
          student: {
            select: { id: true, fullName: true, code: true },
          },
          assignment: {
            include: {
              rubrics: {
                include: {
                  criteria: true,
                },
              },
            },
          },
          rubricScores: {
            include: {
              criteria: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });
    } else {
      // ENTERPRISE_MENTOR: returns submissions of students they mentor (or all for demo/simplicity)
      return this.prisma.submission.findMany({
        include: {
          student: {
            select: { id: true, fullName: true, code: true },
          },
          assignment: {
            include: {
              rubrics: {
                include: {
                  criteria: true,
                },
              },
            },
          },
          rubricScores: {
            include: {
              criteria: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });
    }
  }
}
