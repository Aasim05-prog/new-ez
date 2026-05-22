const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendMailHelper = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.EMAIL_FROM || `EduMarket <${process.env.EMAIL_USER || 'no-reply@edumarket.com'}>`;
    
    if (transporter) {
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });
      console.log(`✉️ Email successfully sent to ${to}: "${subject}"`);
      return true;
    } else {
      console.log('\n=================== 📧 DEV EMAIL OUTBOX ===================');
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('-----------------------------------------------------------');
      console.log(text || html.replace(/<[^>]*>/g, '').trim().slice(0, 300) + '...');
      console.log('===========================================================\n');
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Sends a welcome email to newly registered users.
 */
const sendWelcomeEmail = async (user) => {
  const subject = '📚 Welcome to EduMarket!';
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6C63FF; font-size: 32px; margin: 0; font-weight: 800; letter-spacing: -1px;">EduMarket</h1>
      </div>
      <div style="background: white; border-radius: 10px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #1a1a2e; margin-top: 0; font-size: 22px;">Welcome, ${user.fullName}! 🎉</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">We are absolutely thrilled to have you join the EduMarket community! EduMarket is your new digital study hub where you can share notes, discover curriculum guides, and digitalize files with AI.</p>
        
        <div style="margin: 28px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h4>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Username:</strong> @${user.username}</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Education level:</strong> ${user.educationLevel}</p>
        </div>

        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard" style="background: linear-gradient(135deg, #6C63FF, #5a52d5); color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(108,99,255,0.25);">Go to Dashboard</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
        <p>© 2026 EduMarket. Learn Without Limits.</p>
      </div>
    </div>
  `;
  const text = `Hi ${user.fullName},\n\nWelcome to EduMarket! Your account (@${user.username}) has been created successfully.\n\nEducation Level: ${user.educationLevel}\n\nStart sharing and downloading notes here: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard`;
  
  return sendMailHelper({ to: user.email, subject, html, text });
};

/**
 * Sends a notification to seller when a buyer purchases notes.
 */
const sendPurchaseNotification = async (seller, buyer, note) => {
  const subject = '💰 Note Purchased! You earned credits!';
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6C63FF; font-size: 30px; margin: 0; font-weight: 800;">EduMarket</h1>
      </div>
      <div style="background: white; border-radius: 10px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #059669; margin-top: 0; font-size: 22px;">Credits Received! 💰</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi ${seller.fullName},</p>
        <p style="color: #4b5563; line-height: 1.6;">Awesome news! <strong>${buyer.fullName}</strong> (@${buyer.username}) has just purchased your study notes:</p>
        
        <div style="margin: 20px 0; padding: 20px; background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px;">
          <h3 style="margin: 0; color: #065f46; font-size: 16px;">${note.title}</h3>
          <p style="margin: 6px 0 0; color: #047857; font-weight: 700; font-size: 15px;">Earned: ₹${note.price}</p>
        </div>

        <p style="color: #4b5563; line-height: 1.6;">The credits have been deposited into your seller wallet. Keep uploading notes to build your academic presence!</p>
        
        <div style="text-align: center; margin: 28px 0 0;">
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard" style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 28px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">View Wallet & Stats</a>
        </div>
      </div>
    </div>
  `;
  const text = `Hi ${seller.fullName},\n\nGreat news! ${buyer.fullName} bought your note: "${note.title}". You earned ₹${note.price}.\n\nView details: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard`;
  
  return sendMailHelper({ to: seller.email, subject, html, text });
};

/**
 * Sends a notification email when a user receives a chat message.
 */
const sendNewMessageNotification = async (recipient, sender, messageText) => {
  const subject = `💬 New message from ${sender.fullName}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6C63FF; font-size: 30px; margin: 0; font-weight: 800;">EduMarket</h1>
      </div>
      <div style="background: white; border-radius: 10px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #1a1a2e; margin-top: 0; font-size: 20px;">New Message 💬</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi ${recipient.fullName},</p>
        <p style="color: #4b5563; line-height: 1.6;">You have received a new message from <strong>${sender.fullName}</strong> (@${sender.username}):</p>
        
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #6C63FF; font-style: italic; color: #374151;">
          "${messageText}"
        </div>

        <p style="color: #4b5563; line-height: 1.6;">Reply back in real-time on our active chat window!</p>
        
        <div style="text-align: center; margin: 28px 0 0;">
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/chat/${sender._id}" style="background: linear-gradient(135deg, #6C63FF, #5a52d5); color: white; padding: 12px 28px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Reply Now</a>
        </div>
      </div>
    </div>
  `;
  const text = `Hi ${recipient.fullName},\n\nYou have a new message from ${sender.fullName} (@${sender.username}):\n\n"${messageText}"\n\nReply now: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}/chat/${sender._id}`;
  
  return sendMailHelper({ to: recipient.email, subject, html, text });
};

/**
 * Sends a notification when a user comes online.
 */
const sendOnlineAlert = async (recipient, userWhoCameOnline, userRole = 'Seller') => {
  const subject = `🟢 ${userWhoCameOnline.fullName} is now Online!`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6C63FF; font-size: 30px; margin: 0; font-weight: 800;">EduMarket</h1>
      </div>
      <div style="background: white; border-radius: 10px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #10B981; margin-top: 0; font-size: 20px;">🟢 Live Connection Alert</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi ${recipient.fullName},</p>
        <p style="color: #4b5563; line-height: 1.6;">The ${userRole.toLowerCase()} you were chatting with, <strong>${userWhoCameOnline.fullName}</strong> (@${userWhoCameOnline.username}), just logged in and is now **online**!</p>
        
        <p style="color: #4b5563; line-height: 1.6;">Connect right now on live chat to coordinate reviews, request notes digitalization, or finalize details.</p>
        
        <div style="text-align: center; margin: 28px 0 0;">
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/chat/${userWhoCameOnline._id}" style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 28px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Open Active Chat</a>
        </div>
      </div>
    </div>
  `;
  const text = `Hi ${recipient.fullName},\n\nLive Alert: ${userWhoCameOnline.fullName} (@${userWhoCameOnline.username}) is now online! Start chatting now: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}/chat/${userWhoCameOnline._id}`;
  
  return sendMailHelper({ to: recipient.email, subject, html, text });
};

module.exports = {
  sendWelcomeEmail,
  sendPurchaseNotification,
  sendNewMessageNotification,
  sendOnlineAlert,
};
