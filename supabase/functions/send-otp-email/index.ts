import { createClient } from 'npm:@supabase/supabase-js@2.28.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.info('send-otp-email function initialized');

function renderOtpEmailHtml(otp: string) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Your verification code</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; color: #111;">
      <div>
        <h2>Your verification code</h2>
        <p>Use the code below to complete verification. It will expire in 10 minutes.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0;">${otp}</div>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    </body>
  </html>`;
}

Deno.serve(async (req) => {
  console.log("Request received:", { method: req.method, url: req.url });
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Validate hook authorization header
    const authHeader = req.headers.get('authorization') ?? '';
    const expectedHookSecret = Deno.env.get('AUTH_HOOK_SECRET') ?? '';
    console.log("Found AUTH_HOOK_SECRET:", !!expectedHookSecret);

    if (!expectedHookSecret) {
      console.error('Missing AUTH_HOOK_SECRET in environment');
      return new Response(JSON.stringify({
        success: false,
        error: 'server misconfiguration'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (authHeader !== `Bearer ${expectedHookSecret}`) {
      console.warn('Unauthorized hook call');
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Required env vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const resendFrom = Deno.env.get('RESEND_FROM') ?? '';
    console.log("Found SUPABASE_URL:", !!supabaseUrl);
    console.log("Found SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
    console.log("Found RESEND_API_KEY:", !!resendApiKey);
    console.log("Found RESEND_FROM:", !!resendFrom);

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey || !resendFrom) {
      console.error('One or more required environment variables missing');
      return new Response(JSON.stringify({
        success: false,
        error: 'server misconfiguration'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Use service role key for DB operations (bypass RLS safely from server)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Parse body
    const contentType = req.headers.get('content-type') ?? '';
    let body = {};
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = text ? Object.fromEntries(new URLSearchParams(text)) : {};
      } catch (e) {
        body = {};
      }
    }
    console.log("Request body:", body);

    const url = new URL(req.url);
    const email = body.email || url.searchParams.get('email');
    const otp = body.otp || url.searchParams.get('otp');

    if (!email || !otp) {
      console.error("Missing email or otp in request body");
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: email and otp'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const html = renderOtpEmailHtml(otp);

    // Send via Resend
    console.log(`Sending email to ${email} from ${resendFrom}`);
    const sendResult = await resend.emails.send({
      from: resendFrom,
      to: [email],
      subject: 'Your OTP Code',
      html
    });
    console.log("Resend response:", sendResult);

    if (sendResult.error) {
      console.error('Resend email send error:', sendResult.error);
      // Consider returning a 502 Bad Gateway or a custom error code
      throw new Error(`Failed to send email: ${sendResult.error.message}`);
    }

    // Insert audit log using service role key (non-blocking but await to detect problems)
    try {
      const { error } = await supabaseClient.from('otp_logs').insert({
        email,
        otp,
        sent_at: new Date().toISOString()
      });
      if (error) console.warn('Failed to write otp log:', error.message);
    } catch (e) {
      console.warn('Failed to write otp log (exception):', e);
    }

    return new Response(JSON.stringify({
      success: true,
      data: sendResult
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message ?? String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
