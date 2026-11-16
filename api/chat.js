
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "الرجاء إرسال رسالة"
      });
    }

    const safeMessages = messages
      .filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 2000)
      }));

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `
أنت FIXORIA AI، مساعد خدمة العملاء الرسمي لموقع FIXORIA.
تحدث باللغة العربية وباللهجة الأردنية اللطيفة.
كن مهذباً واحترافياً ومختصراً.

خدمات FIXORIA:
1. التسويق الرقمي وإدارة الحملات الإعلانية.
2. الترويج الإعلامي للصفحات والحسابات.
3. التصميم والهوية البصرية والمحتوى الإبداعي.
4. إدارة حسابات التواصل الاجتماعي.

أجب عن أسئلة العملاء المتعلقة بهذه الخدمات.
لا تخترع أسعاراً أو عروضاً أو معلومات غير معروفة.
إذا سأل العميل عن السعر، أخبره أن السعر يتحدد
حسب احتياجات المشروع، واعرض تسجيل طلبه للتواصل معه.
إذا لم تعرف الإجابة، قل إن فريق FIXORIA سيتابع معه.
لا تدّعِ أنك موظف بشري.
`
            },
            ...safeMessages
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "تعذر الحصول على الرد حالياً"
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content ||
        "عذراً، حاول مرة أخرى."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "حدث خطأ، حاول مرة أخرى."
    });
  }
}
