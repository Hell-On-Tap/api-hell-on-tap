import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
  UseFilters,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  PipeTransform,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  IMAGE_KINDS,
  MAX_IMAGE_BYTES,
  ProfilesService,
} from './profiles.service';
import type { ImageKind } from './user-image.entity';

class ImageKindPipe implements PipeTransform<string, ImageKind> {
  transform(value: string): ImageKind {
    if (!IMAGE_KINDS.includes(value as ImageKind)) {
      throw new BadRequestException('Use "avatar" ou "banner".');
    }
    return value as ImageKind;
  }
}

/** Traduz o erro do upload acima do limite. */
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

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  // ---------- do próprio usuário (exige login) ----------

  @Get('me')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.profiles.mine(req.user.sub);
  }

  /** Muda apelido, nome de exibição e/ou descrição. */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: AuthedRequest, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(req.user.sub, dto);
  }

  /** Envia foto ou banner (multipart, campo "file"). */
  @Put('me/:kind')
  @UseGuards(JwtAuthGuard)
  @UseFilters(ImageTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  setImage(
    @Req() req: AuthedRequest,
    @Param('kind', ImageKindPipe) kind: ImageKind,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profiles.setImage(req.user.sub, kind, file);
  }

  @Delete('me/:kind')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @Req() req: AuthedRequest,
    @Param('kind', ImageKindPipe) kind: ImageKind,
  ) {
    return this.profiles.removeImage(req.user.sub, kind);
  }

  // ---------- públicos (qualquer pessoa, sem conta) ----------

  /** Bytes da foto/banner. A URL leva ?v=<versão>, então pode ficar em cache "para sempre". */
  @Get('images/:userId/:kind')
  async image(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('kind', ImageKindPipe) kind: ImageKind,
    @Res() res: Response,
  ) {
    const image = await this.profiles.image(userId, kind);
    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': String(image.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(image.data);
  }

  @Get(':nickname')
  byNickname(@Param('nickname') nickname: string) {
    return this.profiles.byNickname(nickname);
  }
}
