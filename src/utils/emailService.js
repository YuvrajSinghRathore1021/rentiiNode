// utils/emailService.js 
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    try {
        // Create reusable transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER || 'yuvrajsinghrathore1021@gmail.com',
                pass: process.env.EMAIL_PASS || 'ledawabbxuseiuxa',
            },
        });

        // Send mail
        const info = await transporter.sendMail({
            from: `"My App" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log("Email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Email send error:", error);
        return { success: false, error: error.message };
    }
};

module.exports = sendEmail;
