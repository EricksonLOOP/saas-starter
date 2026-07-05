import nodemailer from 'nodemailer';
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    } : undefined
})
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            html,
            text
        });
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}