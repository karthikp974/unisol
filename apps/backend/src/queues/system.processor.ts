import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { SYSTEM_QUEUE } from "./queue.constants";

@Processor(SYSTEM_QUEUE)
export class SystemProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    await this.prisma.backgroundJobRecord.updateMany({
      where: { externalId: job.id },
      data: { status: "completed", result: { ok: true, jobName: job.name } }
    });

    return { ok: true };
  }
}
