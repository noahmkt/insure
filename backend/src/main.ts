import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { maskRrnDeep } from './common/logging/rrn-mask';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // 모든 로그는 주민번호 마스킹 필터를 거친다 (하드 룰 2)
    logger: new (class {
      log(msg: unknown) { console.log(maskRrnDeep(msg)); }
      error(msg: unknown, trace?: string) { console.error(maskRrnDeep(msg), trace ? maskRrnDeep(trace) : ''); }
      warn(msg: unknown) { console.warn(maskRrnDeep(msg)); }
      debug(msg: unknown) { console.debug(maskRrnDeep(msg)); }
      verbose(msg: unknown) { console.log(maskRrnDeep(msg)); }
    })(),
  });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`insure-backend listening on :${port}`);
}

bootstrap();
