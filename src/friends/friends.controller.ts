import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NicknameDto } from './dto/friend.dto';
import { FriendsService } from './friends.service';

/** Amigos, pedidos, bloqueios e presença do próprio jogador. */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  /** O front chama a cada minuto enquanto o site está aberto. */
  @Post('heartbeat')
  @HttpCode(200)
  heartbeat(@Req() req: AuthedRequest) {
    return this.friends.heartbeat(req.user.sub);
  }

  @Get('friends')
  list(@Req() req: AuthedRequest) {
    return this.friends.list(req.user.sub);
  }

  @Get('friends/status/:userId')
  status(
    @Req() req: AuthedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.friends.status(req.user.sub, userId);
  }

  @Post('friends/requests')
  request(@Req() req: AuthedRequest, @Body() dto: NicknameDto) {
    return this.friends.request(req.user.sub, dto.nickname);
  }

  @Post('friends/requests/:id/accept')
  @HttpCode(200)
  accept(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.friends.accept(req.user.sub, id);
  }

  /** Recusar (recebido) ou cancelar (enviado). */
  @Delete('friends/requests/:id')
  dismiss(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.friends.dismiss(req.user.sub, id);
  }

  @Delete('friends/:userId')
  unfriend(
    @Req() req: AuthedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.friends.unfriend(req.user.sub, userId);
  }

  @Post('blocks')
  @HttpCode(200)
  block(@Req() req: AuthedRequest, @Body() dto: NicknameDto) {
    return this.friends.block(req.user.sub, dto.nickname);
  }

  @Delete('blocks/:userId')
  unblock(
    @Req() req: AuthedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.friends.unblock(req.user.sub, userId);
  }
}
