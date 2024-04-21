import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
@Injectable()
export class EmailService {
  transporter: Transporter;

  constructor(private configService: ConfigService) {
    const host = configService.get('nodemailer_host');
    const port = configService.get('nodemailer_port');
    const user = configService.get('nodemailer_user');
    const pass = configService.get('nodemailer_pass');
    this.transporter = createTransport({
      host,
      port,
      secure: false,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail({ to, subject, html }) {
    const address = this.configService.get('nodemailer_user');
    await this.transporter.sendMail({
      from: {
        name: '会议室预订系统',
        address,
      },
      to,
      subject,
      html,
    });
  }
}
