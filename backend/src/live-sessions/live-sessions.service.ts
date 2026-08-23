import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LiveSessionStatus } from '@prisma/client';

@Injectable()
export class LiveSessionsService {
  constructor(private prisma: PrismaService) {}

  // Generate a unique 6-digit PIN code
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists = true;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const found = await this.prisma.liveSession.findUnique({ where: { sessionCode: code } });
      exists = !!found;
    } while (exists);
    return code;
  }

  // Create a new live session (Teacher only)
  async createSession(teacherId: string, data: {
    title: string;
    courseId: string;
    scheduledAt?: string;
  }) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
      include: { teachers: { select: { id: true } } },
    });
    if (!course) throw new NotFoundException('Курс олдсонгүй');

    const isTeacher = course.teachers.some((t) => t.id === teacherId);
    if (!isTeacher) throw new ForbiddenException('Та энэ курст хичээл заах эрхгүй байна');

    const sessionCode = await this.generateUniqueCode();

    return this.prisma.liveSession.create({
      data: {
        title: data.title,
        courseId: data.courseId,
        teacherId,
        sessionCode,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: 'SCHEDULED',
      },
      include: {
        teacher: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true, code: true } },
      },
    });
  }

  // Get all sessions for a course
  async getSessionsByCourse(courseId: string) {
    return this.prisma.liveSession.findMany({
      where: { courseId },
      include: {
        teacher: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { attendees: true, polls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get a single session details
  async getSession(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        teacher: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true, code: true } },
        attendees: {
          include: { student: { select: { id: true, fullName: true, code: true, avatarUrl: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        polls: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Live хичээл олдсонгүй');
    return session;
  }

  // Find a session by PIN code (for students to join)
  async findByCode(sessionCode: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { sessionCode },
      include: {
        teacher: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true, code: true } },
        _count: { select: { attendees: true } },
      },
    });
    if (!session) throw new NotFoundException('Буруу PIN код — хичээл олдсонгүй');
    if (session.status === 'ENDED') throw new BadRequestException('Энэ live хичээл аль хэдийн дууссан байна');
    return session;
  }

  // Start a session (change status to LIVE)
  async startSession(sessionId: string, teacherId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Live хичээл олдсонгүй');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Зөвхөн хичээл зааж буй багш эхлүүлж болно');
    if (session.status === 'LIVE') throw new BadRequestException('Хичээл аль хэдийн эхэлсэн байна');

    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'LIVE', startedAt: new Date() },
    });
  }

  // End a session (change status to ENDED)
  async endSession(sessionId: string, teacherId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { attendees: true },
    });
    if (!session) throw new NotFoundException('Live хичээл олдсонгүй');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Зөвхөн хичээл зааж буй багш дуусгаж болно');

    // Mark all active attendees as left
    await this.prisma.liveAttendee.updateMany({
      where: { sessionId, leftAt: null },
      data: { leftAt: new Date() },
    });

    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  // Delete a scheduled session (Teacher only, before it starts)
  async deleteSession(sessionId: string, teacherId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Live хичээл олдсонгүй');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Зөвхөн хичээл зааж буй багш устгаж болно');
    if (session.status === 'LIVE') throw new BadRequestException('Явж буй хичээлийг устгах боломжгүй — эхлээд дуусгана уу');
    return this.prisma.liveSession.delete({ where: { id: sessionId } });
  }

  // Register a student attendee joining the session
  async joinSession(sessionCode: string, studentId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { sessionCode } });
    if (!session) throw new NotFoundException('Буруу PIN код');
    if (session.status !== 'LIVE') {
      throw new BadRequestException(
        session.status === 'SCHEDULED'
          ? 'Хичээл эхлээгүй байна — багш эхлүүлэхийг хүлээнэ үү'
          : 'Хичээл аль хэдийн дууссан байна',
      );
    }

    // Upsert to allow re-joining
    return this.prisma.liveAttendee.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
      update: { leftAt: null }, // Re-joining clears leftAt
      create: { sessionId: session.id, studentId },
    });
  }

  // Create a live poll in an active session
  async createPoll(sessionId: string, teacherId: string, data: {
    question: string;
    options: string[];
  }) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Live хичээл олдсонгүй');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Зөвхөн хичээл зааж буй багш санал асуулга үүсгэж болно');
    if (session.status !== 'LIVE') throw new BadRequestException('Санал асуулга зөвхөн явж буй хичээлд үүсгэж болно');

    // Deactivate previous polls
    await this.prisma.livePoll.updateMany({
      where: { sessionId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.livePoll.create({
      data: {
        sessionId,
        question: data.question,
        options: data.options,
        responses: {},
        isActive: true,
      },
    });
  }

  // Submit a poll answer (Student)
  async submitPollAnswer(pollId: string, studentId: string, optionIndex: number) {
    const poll = await this.prisma.livePoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Санал асуулга олдсонгүй');
    if (!poll.isActive) throw new BadRequestException('Санал асуулга хаагдсан байна');
    const options = poll.options as string[];
    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new BadRequestException('Хүчингүй сонголтын дугаар');
    }

    const responses = (poll.responses as Record<string, number>) || {};
    responses[studentId] = optionIndex;

    return this.prisma.livePoll.update({
      where: { id: pollId },
      data: { responses },
    });
  }

  // Get poll results with vote counts
  async getPollResults(pollId: string) {
    const poll = await this.prisma.livePoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Санал асуулга олдсонгүй');

    const options = poll.options as string[];
    const responses = (poll.responses as Record<string, number>) || {};
    const totalVotes = Object.keys(responses).length;

    const results = options.map((opt, idx) => {
      const votes = Object.values(responses).filter((v) => v === idx).length;
      return {
        option: opt,
        votes,
        percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
      };
    });

    return { pollId, question: poll.question, totalVotes, results };
  }
}
