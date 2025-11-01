import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();

    let subject = '';
    let html = '';

    const logoUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/profile-images/logo.png`;

    if (type === 'welcome') {
      subject = 'مرحباً بك في منصة الاستشارات الطبية';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>مرحباً بك</h1>
            </div>
            <div class="content">
              <h2>أهلاً ${data.name}</h2>
              <p>شكراً لتسجيلك في منصة الاستشارات الطبية. نحن سعداء بانضمامك إلينا!</p>
              <p>يمكنك الآن البدء في استخدام المنصة والحصول على استشارات طبية من أفضل الأطباء.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'deposit_received') {
      subject = 'تم استلام طلب الإيداع';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .amount { background: #eef6ff; padding: 15px; border-radius: 8px; text-align: center; font-size: 20px; color: #0369a1; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم استلام طلب الإيداع</h1>
            </div>
            <div class="content">
              <h2>أهلاً ${data.name || ''}</h2>
              <p>تم استلام طلب الإيداع الخاص بك وسيتم مراجعته من قبل فريقنا.</p>
              <div class="amount">${data.amount} جنيه</div>
              ${data.method ? `<p><strong>طريقة الدفع:</strong> ${data.method}</p>` : ''}
              <p>ستصلك رسالة أخرى بعد الموافقة أو الرفض.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'deposit_approved') {
      subject = 'تم قبول طلب الإيداع';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .amount { background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; color: #10B981; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم قبول طلب الإيداع</h1>
            </div>
            <div class="content">
              <h2>مبروك ${data.name}</h2>
              <p>تم قبول طلب الإيداع الخاص بك وإضافة المبلغ إلى محفظتك.</p>
              <div class="amount">${data.amount} جنيه</div>
              ${data.notes ? `<p><strong>ملاحظات:</strong> ${data.notes}</p>` : ''}
              <p>يمكنك الآن استخدام الرصيد في الحصول على استشارات طبية.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'deposit_rejected') {
      subject = 'تم رفض طلب الإيداع';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم رفض طلب الإيداع</h1>
            </div>
            <div class="content">
              <h2>عزيزي ${data.name}</h2>
              <p>نأسف لإبلاغك أنه تم رفض طلب الإيداع الخاص بك بمبلغ ${data.amount} جنيه.</p>
              ${data.notes ? `<p><strong>السبب:</strong> ${data.notes}</p>` : ''}
              <p>يرجى التواصل معنا إذا كان لديك أي استفسارات.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'withdraw_received') {
      subject = 'تم استلام طلب السحب';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .amount { background: #eef6ff; padding: 15px; border-radius: 8px; text-align: center; font-size: 20px; color: #0369a1; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم استلام طلب السحب</h1>
            </div>
            <div class="content">
              <h2>عزيزي الدكتور ${data.name || ''}</h2>
              <p>تم استلام طلب السحب الخاص بك وجاري المراجعة من قبل الإدارة.</p>
              <div class="amount">الصافي المطلوب: ${data.amount} جنيه</div>
              <p>ستصلك رسالة أخرى بعد الموافقة أو الرفض.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'withdraw_approved') {
      subject = 'تم قبول طلب السحب';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .amount { background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; color: #10B981; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم قبول طلب السحب</h1>
            </div>
            <div class="content">
              <h2>عزيزي الدكتور ${data.name}</h2>
              <p>تم قبول طلب السحب الخاص بك وسيتم تحويل المبلغ قريباً.</p>
              <div class="amount">${data.amount} جنيه</div>
              ${data.notes ? `<p><strong>ملاحظات:</strong> ${data.notes}</p>` : ''}
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'withdraw_rejected') {
      subject = 'تم رفض طلب السحب';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم رفض طلب السحب</h1>
            </div>
            <div class="content">
              <h2>عزيزي الدكتور ${data.name}</h2>
              <p>نأسف لإبلاغك أنه تم رفض طلب السحب الخاص بك بمبلغ ${data.amount} جنيه.</p>
              ${data.notes ? `<p><strong>السبب:</strong> ${data.notes}</p>` : ''}
              <p>تم إعادة المبلغ إلى محفظتك. يرجى التواصل معنا إذا كان لديك أي استفسارات.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'doctor_request_approved') {
      subject = 'تم قبول طلب التسجيل كطبيب';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم قبول طلبك</h1>
            </div>
            <div class="content">
              <h2>مبروك د/ ${data.name}</h2>
              <p>تمت الموافقة على طلبك للتسجيل كطبيب في المنصة. يمكنك الآن تسجيل الدخول إلى لوحة تحكم الطبيب وبدء تقديم الاستشارات.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'doctor_request_rejected') {
      subject = 'تم رفض طلب التسجيل كطبيب';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>تم رفض الطلب</h1>
            </div>
            <div class="content">
              <h2>عزيزي ${data.name}</h2>
              <p>نأسف لإبلاغك أنه تم رفض طلب تسجيلك كطبيب في الوقت الحالي.</p>
              ${data.notes ? `<p><strong>السبب:</strong> ${data.notes}</p>` : ''}
              <p>يمكنك إعادة التقديم بعد استيفاء المتطلبات.</p>
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'custom') {
      subject = data.subject || 'رسالة من منصة الاستشارات الطبية';
      html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 30px; text-align: center; }
            .header img { max-width: 80px; margin-bottom: 15px; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; line-height: 1.8; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Logo" />
              <h1>${data.subject || 'رسالة من المنصة'}</h1>
            </div>
            <div class="content">
              ${data.message ? data.message.replace(/\n/g, '<br>') : ''}
            </div>
            <div class="footer">
              <p>© 2025 منصة الاستشارات الطبية</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'منصة الاستشارات الطبية <team@egyptianai.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
