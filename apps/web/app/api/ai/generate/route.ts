import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
})

const SYSTEM_PROMPT = `You are an expert writing assistant embedded in Omni, a collaborative workspace platform. You help users write, edit, and improve documents.

Rules:
- Write in clean, professional prose. Be concise but thorough.
- When generating content, use markdown formatting (headings, lists, bold, code blocks) as appropriate.
- When improving text, preserve the original meaning and tone while making it clearer and more polished.
- When summarizing, capture the key points in a structured format.
- Never include meta-commentary like "Here's your improved text:" — just output the content directly.
- Match the language of the user's input.`

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, action } = await request.json()

    if (!prompt && !context) {
      return NextResponse.json({ error: 'Missing prompt or context' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    let userMessage = ''
    switch (action) {
      case 'generate':
        userMessage = prompt
        break
      case 'improve':
        userMessage = `Improve the following text. Make it clearer, more concise, and better structured while preserving the original meaning:\n\n${context}`
        break
      case 'summarize':
        userMessage = `Summarize the following content into key bullet points:\n\n${context}`
        break
      case 'continue':
        userMessage = `Continue writing the following text naturally. Match the style and topic:\n\n${context}`
        break
      case 'fix-grammar':
        userMessage = `Fix any grammar, spelling, and punctuation errors in the following text. Only fix errors, don't change the style:\n\n${context}`
        break
      case 'make-shorter':
        userMessage = `Make the following text significantly shorter while keeping the key points:\n\n${context}`
        break
      case 'make-longer':
        userMessage = `Expand the following text with more detail, examples, and explanation:\n\n${context}`
        break
      case 'change-tone':
        userMessage = `Rewrite the following text in a ${prompt || 'professional'} tone:\n\n${context}`
        break
      default:
        userMessage = prompt || context
    }

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text || ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI generation failed' }, { status: 500 })
  }
}
