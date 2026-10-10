import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  PayloadTooLargeException,
  PipeTransform,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_IMAGE_BYTES } from '../profiles/profiles.service';
import { ClansService } from './clans.service';
import {
  CreateClanDto,
  CreateRoleDto,
  InviteDto,
  MoveRoleDto,
  SetMemberRoleDto,
  TransferDto,
  UpdateClanDto,
  UpdateRoleDto,
} from './dto/clan.dto';
import type { ClanImageKind } from './entities/clan-image.entity';

class ClanImageKindPipe implements PipeTransform<string, ClanImageKind> {
  transform(value: string): ClanImageKind {
    if (value !== 'logo' && value !== 'banner')
      throw new BadRequestException('Use "logo" ou "banner".');
    return value;
  }
}

@Catch(PayloadTooLargeException)
class ImageTooLargeFilter implements ExceptionFilter {
  catch(_: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(413).json({
      message: 'A imagem pode ter no máximo 2 MB.',
      error: 'Payload Too Large',
      statusCode: 413,
    });
  }
}

/** Rotas do clã. :tag é a tag do clã (sem diferenciar maiúsculas). */
@Controller('clans')
export class ClansController {
  constructor(private readonly clans: ClansService) {}

  // ---------- públicas ----------

  @Get()
  search(@Query('search') search?: string, @Query('limit') limit?: string) {
    return this.clans.search(search ?? '', Number(limit) || 24);
  }

  @Get('images/:clanId/:kind')
  async image(
    @Param('clanId', ParseUUIDPipe) clanId: string,
    @Param('kind', ClanImageKindPipe) kind: ClanImageKind,
    @Res() res: Response,
  ) {
    const image = await this.clans.image(clanId, kind);
    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': String(image.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(image.data);
  }

  @Get(':tag')
  view(@Param('tag') tag: string) {
    return this.clans.publicView(tag);
  }

  // ---------- com login ----------

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthedRequest, @Body() dto: CreateClanDto) {
    return this.clans.create(req.user.sub, dto);
  }

  /** O que o jogador logado é/pode neste clã. */
  @Get(':tag/me')
  @UseGuards(JwtAuthGuard)
  viewer(@Req() req: AuthedRequest, @Param('tag') tag: string) {
    return this.clans.viewer(tag, req.user.sub);
  }

  @Patch(':tag')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Body() dto: UpdateClanDto,
  ) {
    return this.clans.update(tag, req.user.sub, dto);
  }

  @Delete(':tag')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthedRequest, @Param('tag') tag: string) {
    return this.clans.remove(tag, req.user.sub);
  }

  @Put(':tag/images/:kind')
  @UseGuards(JwtAuthGuard)
  @UseFilters(ImageTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  setImage(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('kind', ClanImageKindPipe) kind: ClanImageKind,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.clans.setImage(tag, req.user.sub, kind, file);
  }

  @Delete(':tag/images/:kind')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('kind', ClanImageKindPipe) kind: ClanImageKind,
  ) {
    return this.clans.removeImage(tag, req.user.sub, kind);
  }

  @Post(':tag/transfer')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  transfer(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Body() dto: TransferDto,
  ) {
    return this.clans.transfer(tag, req.user.sub, dto.userId);
  }

  // ---------- entrada ----------

  /** Entrar (aberto), pedir para entrar (pedido) ou aceitar convite pendente. */
  @Post(':tag/join')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  join(@Req() req: AuthedRequest, @Param('tag') tag: string) {
    return this.clans.requestJoin(tag, req.user.sub);
  }

  @Post(':tag/leave')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  leave(@Req() req: AuthedRequest, @Param('tag') tag: string) {
    return this.clans.leave(tag, req.user.sub);
  }

  @Post(':tag/invites')
  @UseGuards(JwtAuthGuard)
  invite(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Body() dto: InviteDto,
  ) {
    return this.clans.invite(tag, req.user.sub, dto.nickname);
  }

  /** Convites enviados e pedidos recebidos pelo clã. */
  @Get(':tag/invites')
  @UseGuards(JwtAuthGuard)
  pending(@Req() req: AuthedRequest, @Param('tag') tag: string) {
    return this.clans.pending(tag, req.user.sub);
  }

  @Post(':tag/invites/:id/approve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  approve(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clans.approve(tag, req.user.sub, id);
  }

  @Delete(':tag/invites/:id')
  @UseGuards(JwtAuthGuard)
  cancelPending(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clans.cancelPending(tag, req.user.sub, id);
  }

  // ---------- membros ----------

  @Patch(':tag/members/:userId')
  @UseGuards(JwtAuthGuard)
  setMemberRole(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetMemberRoleDto,
  ) {
    return this.clans.setMemberRole(tag, req.user.sub, userId, dto.roleId);
  }

  @Delete(':tag/members/:userId')
  @UseGuards(JwtAuthGuard)
  kick(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.clans.kick(tag, req.user.sub, userId);
  }

  // ---------- cargos ----------

  @Post(':tag/roles')
  @UseGuards(JwtAuthGuard)
  createRole(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.clans.createRole(tag, req.user.sub, dto);
  }

  @Patch(':tag/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  updateRole(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.clans.updateRole(tag, req.user.sub, roleId, dto);
  }

  @Post(':tag/roles/:roleId/move')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  moveRole(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: MoveRoleDto,
  ) {
    return this.clans.moveRole(tag, req.user.sub, roleId, dto.direction);
  }

  @Delete(':tag/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  removeRole(
    @Req() req: AuthedRequest,
    @Param('tag') tag: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.clans.removeRole(tag, req.user.sub, roleId);
  }
}

/** Rotas do próprio jogador (meus clãs e convites recebidos). */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MyClansController {
  constructor(private readonly clans: ClansService) {}

  @Get('clans')
  mine(@Req() req: AuthedRequest) {
    return this.clans.mine(req.user.sub);
  }

  @Get('clan-invites')
  invites(@Req() req: AuthedRequest) {
    return this.clans.myInvites(req.user.sub);
  }

  @Post('clan-invites/:id/accept')
  @HttpCode(200)
  accept(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.clans.acceptInvite(req.user.sub, id);
  }

  @Delete('clan-invites/:id')
  decline(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.clans.declineInvite(req.user.sub, id);
  }
}

/** Clãs de um jogador, para o perfil público. */
@Controller('profiles')
export class ProfileClansController {
  constructor(private readonly clans: ClansService) {}

  @Get(':nickname/clans')
  clansOf(@Param('nickname') nickname: string) {
    return this.clans.clansOfNickname(nickname);
  }
}
