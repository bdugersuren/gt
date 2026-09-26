import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LiveSessionsService } from './live-sessions.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map((value) => value.trim()),
    credentials: true,
  },
  namespace: '/live',
})
export class LiveSessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Map: socketId → { userId, sessionCode }
  private connectedClients = new Map<string, { userId: string; sessionId: string; role: string }>();

  constructor(
    private liveSessionsService: LiveSessionsService,
    private jwtService: JwtService,
  ) {}

  // Authenticate and extract user from JWT on connection
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      (client as any).user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const meta = this.connectedClients.get(client.id);
    if (meta) {
      this.server.to(meta.sessionId).emit('attendee-left', { userId: meta.userId });
      this.connectedClients.delete(client.id);
    }
  }

  // Student / Teacher joins a live session room by PIN
  @SubscribeMessage('join-session')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionCode: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    try {
      const session = await this.liveSessionsService.findByCode(data.sessionCode, user.sub, user.roles || []);

      // Register student as attendee
      if (!user.roles?.includes('TEACHER') && !user.roles?.includes('MANAGER')) {
        await this.liveSessionsService.joinSession(data.sessionCode, user.sub);
      }

      client.join(session.id);
      this.connectedClients.set(client.id, {
        userId: user.sub,
        sessionId: session.id,
        role: user.roles?.includes('TEACHER') ? 'TEACHER' : 'STUDENT',
      });

      // Notify others in the room
      this.server.to(session.id).emit('attendee-update', {
        userId: user.sub,
        fullName: user.fullName,
      });

      client.emit('session-joined', {
        sessionId: session.id,
        title: session.title,
        courseTitle: session.course?.title,
        teacherName: session.teacher?.fullName,
      });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  // Teacher pushes lesson content to all students
  @SubscribeMessage('push-content')
  async handlePushContent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; lessonId: string; lessonTitle: string; content: string },
  ) {
    const meta = this.connectedClients.get(client.id);
    if (!meta || meta.role !== 'TEACHER') {
      client.emit('error', { message: 'Зөвхөн багш агуулга илгээх боломжтой' });
      return;
    }
    this.server.to(data.sessionId).emit('content-pushed', {
      lessonId: data.lessonId,
      lessonTitle: data.lessonTitle,
      content: data.content,
    });
  }

  // Teacher launches a live poll
  @SubscribeMessage('launch-poll')
  async handleLaunchPoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; question: string; options: string[] },
  ) {
    const user = (client as any).user;
    const meta = this.connectedClients.get(client.id);
    if (!meta || meta.role !== 'TEACHER') {
      client.emit('error', { message: 'Зөвхөн багш санал асуулга явуулж болно' });
      return;
    }
    try {
      const poll = await this.liveSessionsService.createPoll(data.sessionId, user.sub, {
        question: data.question,
        options: data.options,
      });
      this.server.to(data.sessionId).emit('poll-launched', {
        pollId: poll.id,
        question: poll.question,
        options: poll.options.map((option) => option.text),
      });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  // Student submits a poll answer
  @SubscribeMessage('submit-poll-answer')
  async handlePollAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pollId: string; optionIndex: number },
  ) {
    const user = (client as any).user;
    const meta = this.connectedClients.get(client.id);
    if (!meta) return;

    try {
      await this.liveSessionsService.submitPollAnswer(data.pollId, user.sub, data.optionIndex);
      const results = await this.liveSessionsService.getPollResults(data.pollId);
      // Broadcast updated results to teacher room (teacher can see live results)
      this.server.to(meta.sessionId).emit('poll-results', results);
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  // Teacher ends the session
  @SubscribeMessage('end-session')
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const user = (client as any).user;
    const meta = this.connectedClients.get(client.id);
    if (!meta || meta.role !== 'TEACHER') return;

    try {
      await this.liveSessionsService.endSession(data.sessionId, user.sub);
      this.server.to(data.sessionId).emit('session-ended', { sessionId: data.sessionId });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }
}
