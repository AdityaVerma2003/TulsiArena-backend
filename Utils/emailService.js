
import nodemailer from 'nodemailer';

// const TOKEN = "2f080e5559f162bd1aea228163ca41ee";

const transporter = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api", // Get from Mailtrap inbox settings
    pass: "2f080e5559f162bd1aea228163ca41ee"  // Get from Mailtrap inbox settings
  }
});

// Registration Email Template
const getRegistrationEmailTemplate = (userName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TulsiArena</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0f172a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: rgba(255, 255, 255, 0.05);">
                  <h1 style="margin: 0; color: #60a5fa; font-size: 36px; font-weight: bold;">
                    🎉 Welcome to TulsiArena!
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px;">
                    Hi ${userName}! 👋
                  </h2>
                  
                  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Thank you for registering with TulsiArena! We're thrilled to have you join our community.
                  </p>
                  
                  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    Your account has been successfully created and you can now start booking your favorite facilities.
                  </p>

                  <!-- Features -->
                  <table style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; margin-bottom: 10px;">
                        <p style="margin: 0; color: #60a5fa; font-weight: bold; font-size: 16px;">⚽ Book Turfs</p>
                        <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">Reserve your spot instantly</p>
                      </td>
                    </tr>
                    <tr><td style="height: 10px;"></td></tr>
                    <tr>
                      <td style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 10px;">
                        <p style="margin: 0; color: #60a5fa; font-weight: bold; font-size: 16px;">🏊 Swimming Pools</p>
                        <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">Dive into great experiences</p>
                      </td>
                    </tr>
                    <tr><td style="height: 10px;"></td></tr>
                    <tr>
                      <td style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 10px;">
                        <p style="margin: 0; color: #60a5fa; font-weight: bold; font-size: 16px;">🎯 Combo Packages</p>
                        <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">Get the best of both worlds</p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">
                          Start Booking Now 🚀
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 30px 0 0; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                    If you have any questions, feel free to reach out to our support team. We're here to help! 💙
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background: rgba(0, 0, 0, 0.2); text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    © 2024 TulsiArena. All rights reserved.
                  </p>
                  <p style="margin: 10px 0 0; color: #64748b; font-size: 12px;">
                    You received this email because you registered on our platform.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Send Registration Email Function
const sendRegistrationEmail = async (userEmail, userName) => {
  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ Email server is ready');

    const mailOptions = {
      from: {
        name: 'TulsiArena',
        address: "hello@demomailtrap.com"
      },
      to: userEmail,
      subject: '🎉 Welcome to TulsiArena - Registration Successful!',
      html: getRegistrationEmailTemplate(userName),
      text: `Hi ${userName}! Welcome to TulsiArena. Your registration was successful!` // Plain text fallback
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Registration email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending registration email:', error.message);
    return { success: false, error: error.message };
  }
};

export {
  sendRegistrationEmail
};
