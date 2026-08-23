import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { MessagesService } from '../services/messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // Send message
  @Post()
  async sendMessage(
    @Body() body: { receiverId: string; content: string; courseId?: string },
    @Request() req: any,
  ) {
    return this.messagesService.sendMessage(
      req.user.id,
      body.receiverId,
      body.content,
      body.courseId,
    );
  }

  // Get conversation history with a target user
  @Get('conversation/:userId')
  async getConversation(
    @Param('userId') targetUserId: string,
    @Query('courseId') courseId: string,
    @Request() req: any,
  ) {
    return this.messagesService.getConversation(req.user.id, targetUserId, courseId);
  }

  // Get contacts list for active course/role context
  @Get('contacts')
  async getContacts(
    @Query('courseId') courseId: string,
    @Headers('x-active-role') activeRoleHeader: string,
    @Request() req: any,
  ) {
    const activeRole = activeRoleHeader || req.user.roles[0] || 'STUDENT';
    return this.messagesService.getChatContacts(req.user.id, activeRole, courseId);
  }
}
