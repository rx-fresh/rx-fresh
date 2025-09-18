import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { OtpEmail } from './_templates/otp-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const {
      user,
      email_data: { token, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
        user_metadata?: {
          full_name?: string;
        };
      };
      email_data: {
        token: string;
        email_action_type: 'signup' | 'recovery' | 'invite' | 'email_change_current' | 'email_change_new';
      };
    };

    console.log(`Sending OTP email to ${user.email} for ${email_action_type}`);

    // Determine email subject and content based on action type
    let subject = 'Your verification code';
    let actionText = 'verify your account';
    
    switch (email_action_type) {
      case 'signup':
        subject = 'Complete your RX Prescribers signup';
        actionText = 'complete your signup';
        break;
      case 'recovery':
        subject = 'Reset your password';
        actionText = 'reset your password';
        break;
      case 'email_change_current':
      case 'email_change_new':
        subject = 'Confirm email change';
        actionText = 'confirm your email change';
        break;
      case 'invite':
        subject = 'You\'ve been invited to RX Prescribers';
        actionText = 'accept your invitation';
        break;
    }

    const html = await renderAsync(
      React.createElement(OtpEmail, {
        token,
        userName: user.user_metadata?.full_name || user.email,
        actionText,
        appName: 'RX Prescribers'
      })
    );

    const { error } = await resend.emails.send({
      from: 'RX Prescribers <noreply@rxprescribers.com>',
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log(`OTP email sent successfully to ${user.email}`);

  } catch (error) {
    console.error('Error processing email hook:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
