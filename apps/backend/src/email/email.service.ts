import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

type TeacherWelcomeEmail = {
  email: string;
  fullName: string;
  employeeCode: string;
  temporaryPassword: string;
  assignments: string[];
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendTeacherWelcome(input: TeacherWelcomeEmail) {
    const transporter = this.createTransporter();
    if (!transporter) {
      this.logger.warn("SMTP is not configured. Skipping teacher welcome email.");
      return;
    }

    const fromName = this.config.get<string>("EMAIL_FROM_NAME") ?? "KIET ERP";
    const fromAddress = this.config.get<string>("EMAIL_FROM_ADDRESS") ?? this.config.get<string>("SMTP_USER");
    if (!fromAddress) {
      this.logger.warn("EMAIL_FROM_ADDRESS/SMTP_USER is not configured. Skipping teacher welcome email.");
      return;
    }

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.email,
      subject: "Welcome to KIET ERP",
      text: [
        `Hello ${input.fullName},`,
        "",
        "Your teacher account has been created in KIET ERP.",
        `Teacher ID: ${input.employeeCode}`,
        `Temporary password: ${input.temporaryPassword}`,
        "",
        "Assigned responsibilities:",
        ...(input.assignments.length ? input.assignments.map((assignment) => `- ${assignment}`) : ["- No assignments added"]),
        "",
        "Please sign in and change your password after first login.",
        "",
        "Regards,",
        "KIET ERP"
      ].join("\n")
    });
    this.logger.log(`Teacher welcome email sent to ${input.email}. MessageId: ${result.messageId}`);
  }

  private createTransporter() {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
}
