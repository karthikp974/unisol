import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  console.log("Bootstrapping ERP backend...");
  const app = await NestFactory.create(AppModule, { cors: true });
  console.log("ERP backend modules loaded.");
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const config = app.get(ConfigService);
  const port = config.get<number>("BACKEND_PORT") ?? 4000;
  await app.listen(port);
  console.log(`ERP backend listening on http://localhost:${port}/api`);
}

void bootstrap();
