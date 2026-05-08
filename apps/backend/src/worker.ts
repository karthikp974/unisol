import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrapWorker() {
  await NestFactory.createApplicationContext(AppModule);
  // Queue processors are registered by Nest and keep this process alive.
}

void bootstrapWorker();
