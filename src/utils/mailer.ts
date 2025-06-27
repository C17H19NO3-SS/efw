import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { EnvHelper } from './env';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface MailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  company?: string;
}

export class Mailer {
  private static instance: Mailer;
  private transporter: Transporter;
  private config: MailConfig;

  private constructor(config: MailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false // For development only
      }
    });
  }

  public static getInstance(config?: MailConfig): Mailer {
    if (!Mailer.instance) {
      if (!config) {
        // Default configuration from environment variables
        const defaultConfig: MailConfig = {
          host: EnvHelper.get('MAIL_HOST', 'smtp.gmail.com'),
          port: EnvHelper.getNumber('MAIL_PORT', 587),
          secure: EnvHelper.getBoolean('MAIL_SECURE', false),
          auth: {
            user: EnvHelper.get('MAIL_USER', ''),
            pass: EnvHelper.get('MAIL_PASSWORD', '')
          },
          from: EnvHelper.get('MAIL_FROM', 'noreply@portfolio.dev')
        };
        config = defaultConfig;
      }
      Mailer.instance = new Mailer(config);
    }
    return Mailer.instance;
  }

  public async sendMail(options: MailOptions): Promise<boolean> {
    try {
      const mailOptions: SendMailOptions = {
        from: this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc,
        bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  public async sendContactForm(
    contactData: ContactFormData, 
    recipientEmail: string
  ): Promise<boolean> {
    const htmlTemplate = this.generateContactFormHTML(contactData);
    const textTemplate = this.generateContactFormText(contactData);

    return await this.sendMail({
      to: recipientEmail,
      subject: `Portfolio Contact Form: ${contactData.subject || 'New Message'}`,
      text: textTemplate,
      html: htmlTemplate
    });
  }

  public async sendContactConfirmation(contactData: ContactFormData): Promise<boolean> {
    const htmlTemplate = this.generateConfirmationHTML(contactData);
    const textTemplate = this.generateConfirmationText(contactData);

    return await this.sendMail({
      to: contactData.email,
      subject: 'Thank you for contacting us!',
      text: textTemplate,
      html: htmlTemplate
    });
  }

  private generateContactFormHTML(data: ContactFormData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Contact Form</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #667eea;
            margin: 0;
            font-size: 28px;
        }
        .field {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .field-label {
            font-weight: bold;
            color: #555;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        .field-value {
            font-size: 16px;
            color: #333;
            word-wrap: break-word;
        }
        .message-field {
            background: #e8f2ff;
            border-left-color: #2196F3;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .timestamp {
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📬 New Contact Form Submission</h1>
            <p class="timestamp">Received: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="field">
            <div class="field-label">👤 Name</div>
            <div class="field-value">${data.name}</div>
        </div>
        
        <div class="field">
            <div class="field-label">📧 Email</div>
            <div class="field-value">${data.email}</div>
        </div>
        
        ${data.phone ? `
        <div class="field">
            <div class="field-label">📞 Phone</div>
            <div class="field-value">${data.phone}</div>
        </div>
        ` : ''}
        
        ${data.company ? `
        <div class="field">
            <div class="field-label">🏢 Company</div>
            <div class="field-value">${data.company}</div>
        </div>
        ` : ''}
        
        ${data.subject ? `
        <div class="field">
            <div class="field-label">📋 Subject</div>
            <div class="field-value">${data.subject}</div>
        </div>
        ` : ''}
        
        <div class="field message-field">
            <div class="field-label">💬 Message</div>
            <div class="field-value">${data.message.replace(/\n/g, '<br>')}</div>
        </div>
        
        <div class="footer">
            <p>This message was sent from your portfolio contact form.</p>
            <p>Built with EFW (Efficient Framework for Web)</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateContactFormText(data: ContactFormData): string {
    return `
NEW CONTACT FORM SUBMISSION
===========================

Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}
${data.company ? `Company: ${data.company}` : ''}
${data.subject ? `Subject: ${data.subject}` : ''}

Message:
--------
${data.message}

Received: ${new Date().toLocaleString()}

This message was sent from your portfolio contact form.
Built with EFW (Efficient Framework for Web)
    `;
  }

  private generateConfirmationHTML(data: ContactFormData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .header {
            color: #667eea;
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 20px;
        }
        .message {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">✅</div>
        <h1>Thank You, ${data.name}!</h1>
        
        <div class="message">
            <p><strong>Your message has been received successfully!</strong></p>
            <p>I'll get back to you as soon as possible.</p>
        </div>
        
        <p>Here's a summary of your message:</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left;">
            <strong>Subject:</strong> ${data.subject || 'General Inquiry'}<br>
            <strong>Email:</strong> ${data.email}<br>
            <strong>Sent:</strong> ${new Date().toLocaleString()}
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Portfolio Team</p>
            <p><em>Built with EFW (Efficient Framework for Web)</em></p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateConfirmationText(data: ContactFormData): string {
    return `
Thank You, ${data.name}!

Your message has been received successfully!
I'll get back to you as soon as possible.

Message Summary:
- Subject: ${data.subject || 'General Inquiry'}
- Email: ${data.email}
- Sent: ${new Date().toLocaleString()}

Best regards,
Your Portfolio Team

Built with EFW (Efficient Framework for Web)
    `;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Mail server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Mail server connection failed:', error);
      return false;
    }
  }

  public getConfig(): Partial<MailConfig> {
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.from
    };
  }
}

// Export convenience functions
export const sendMail = async (options: MailOptions): Promise<boolean> => {
  const mailer = Mailer.getInstance();
  return await mailer.sendMail(options);
};

export const sendContactForm = async (
  contactData: ContactFormData, 
  recipientEmail: string
): Promise<boolean> => {
  const mailer = Mailer.getInstance();
  return await mailer.sendContactForm(contactData, recipientEmail);
};

export const sendContactConfirmation = async (contactData: ContactFormData): Promise<boolean> => {
  const mailer = Mailer.getInstance();
  return await mailer.sendContactConfirmation(contactData);
};

export const testMailConnection = async (): Promise<boolean> => {
  const mailer = Mailer.getInstance();
  return await mailer.testConnection();
};