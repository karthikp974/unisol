import { BullModule, InjectQueue } from "@nestjs/bullmq";
import { Injectable, Module } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { SYSTEM_QUEUE } from "./queue.constants";
import { SystemProcessor } from "./system.processor";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(SYSTEM_QUEUE)
    private readonly systemQueue: Queue,
    private readonly prisma: PrismaService
  ) {}

  async enqueueSystemJob(name: string, payload: Record<string, unknown>) {
    const record = await this.prisma.backgroundJobRecord.create({
      data: {
        queueName: SYSTEM_QUEUE,
        jobName: name,
        status: "queued",
        payload: payload as Prisma.InputJsonObject
      }
    });

    const job = await this.systemQueue.add(name, payload, {
      jobId: record.id,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200
    });

    await this.prisma.backgroundJobRecord.update({
      where: { id: record.id },
      data: { externalId: job.id }
    });

    return record;
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: SYSTEM_QUEUE })],
  providers: [QueueService, SystemProcessor],
  exports: [QueueService]
})
export class QueuesModule {}
