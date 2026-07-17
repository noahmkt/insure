import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { maskRrnDeep } from '../logging/rrn-mask';

/**
 * 전역 예외 필터 — 에러 응답을 API 명세(docs/04)의
 * { "error": { "code", "message", "detail" } } 포맷으로 래핑한다.
 * 응답 본문도 주민번호 마스킹을 거친다(하드 룰 2).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '서버 오류가 발생했습니다.';
    let detail: unknown = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = 'ERROR';
      } else {
        const b = body as Record<string, unknown>;
        code = (b.code as string) ?? (b.error as string) ?? 'ERROR';
        message = (b.message as string) ?? message;
        detail = b.detail ?? {};
      }
    }

    res.status(status).json(maskRrnDeep({ error: { code, message, detail } }));
  }
}
