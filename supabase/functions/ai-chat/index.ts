import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SERP_API_KEY = Deno.env.get('SERP_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function searchGoogle(query: string, type: string = 'search') {
  try {
    const url = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}&engine=google&gl=eg&hl=ar`;
    
    if (type === 'images') {
      const imageUrl = `https://serpapi.com/search?q=${encodeURIComponent(query)}&tbm=isch&api_key=${SERP_API_KEY}&engine=google&gl=eg&hl=ar`;
      const response = await fetch(imageUrl);
      const data = await response.json();
      return data.images_results || [];
    }
    
    const response = await fetch(url);
    const data = await response.json();
    return data.organic_results || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    
    const lastMessage = messages[messages.length - 1].content;
    
    // Check if the message needs web search
    const needsSearch = lastMessage.includes('دواء') || 
                       lastMessage.includes('علاج') || 
                       lastMessage.includes('صيدلية') ||
                       lastMessage.includes('مرض');
    
    let searchContext = '';
    let imageResults: any[] = [];
    
    if (needsSearch) {
      // Search for medication info
      const searchResults = await searchGoogle(`${lastMessage} هيئة الدواء المصرية`, 'search');
      
      // Search for drug images
      imageResults = await searchGoogle(`${lastMessage} دواء`, 'images');
      
      searchContext = `\n\nمعلومات من البحث:\n${searchResults.slice(0, 3).map((r: any) => 
        `- ${r.title}: ${r.snippet}`
      ).join('\n')}`;
    }

    const systemPrompt = `أنت Doc-Smart، مساعد طبي ذكي متخصص في تقديم المشورة الطبية باللغة العربية.
    
مهامك:
1. تقديم معلومات طبية دقيقة ومفيدة
2. البحث عن الأدوية في مصادر موثوقة مثل هيئة الدواء المصرية
3. توجيه المستخدمين للصيدليات القريبة عند الحاجة
4. التأكيد على أهمية استشارة الطبيب المختص

ملاحظات مهمة:
- لا تحل محل الطبيب المختص
- اذكر المصادر عند تقديم معلومات طبية
- كن واضحاً ودقيقاً
- استخدم لغة عربية فصحى مبسطة

${searchContext}`;

    const modelName = model === 'doc-smart' ? 'openai/gpt-oss-20b:free' : 'z-ai/glm-4.5-air:free';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://medical-consultation.lovable.app',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Create a transform stream to add sources and images
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start processing the stream
    (async () => {
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let firstChunk = true;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Add sources and images at the end
            if (searchContext) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: { content: '\n\n📚 المصادر المستخدمة في البحث' },
                  index: 0
                }]
              })}\n\n`));
            }
            
            if (imageResults.length > 0) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: { content: '\n\n🖼️ صور الدواء من جوجل' },
                  index: 0
                }]
              })}\n\n`));
            }
            
            await writer.write(encoder.encode('data: [DONE]\n\n'));
            break;
          }
          
          await writer.write(value);
        }
      } catch (error) {
        console.error('Stream error:', error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});