import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  ASSISTANT_TOOLS,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
  analyzeSchedule,
  suggestStudyPlan
} from "@/lib/ai-assistant"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get user context (courses and recent events)
    const courses = await prisma.course.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, term: true }
    })

    const recentEvents = await prisma.event.findMany({
      where: { userId: session.userId },
      include: { course: true },
      orderBy: { startDate: 'desc' },
      take: 10
    })

    // Build system context
    const systemContext = `You are an AI calendar assistant for a university student. You can help manage their academic calendar.

Current courses: ${courses.map(c => `${c.name} (${c.term || 'No term'})`).join(', ') || 'None'}

Recent events: ${recentEvents.map(e => `${e.title} (${e.type}) on ${e.startDate.toLocaleDateString()}`).slice(0, 5).join(', ') || 'None'}

You have access to these functions:
- create_event: Create new events (assignments, exams, meetings, study sessions, recurring events)
- update_event: Update existing events (reschedule, rename)
- delete_event: Delete events
- search_events: Search for events
- analyze_schedule: Analyze schedule for conflicts, busy periods, workload
- suggest_study_plan: Create study plans for exams

When creating recurring events (e.g., "every Thursday"), use the recurring parameter.
When the user mentions a course name, try to match it to their existing courses.
Always confirm destructive actions (delete, update) by asking first.
Be concise and helpful. Use natural language.`

    // Call Groq API with function calling
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("Missing GROQ_API_KEY")

    const messages = [
      { role: "system", content: systemContext },
      ...conversationHistory,
      { role: "user", content: message }
    ]

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: ASSISTANT_TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      throw new Error(`Groq API error: ${groqResponse.status} ${errorText}`)
    }

    const groqData = await groqResponse.json()
    const assistantMessage = groqData.choices[0]?.message

    if (!assistantMessage) {
      throw new Error("No response from AI")
    }

    // Check if AI wants to call a function
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0]
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments)

      let functionResult

      // Execute the requested function
      switch (functionName) {
        case "create_event":
          functionResult = await createEvent(session.userId, functionArgs)
          break
        case "update_event":
          functionResult = await updateEvent(session.userId, functionArgs)
          break
        case "delete_event":
          functionResult = await deleteEvent(session.userId, functionArgs)
          break
        case "search_events":
          functionResult = await searchEvents(session.userId, functionArgs)
          break
        case "analyze_schedule":
          functionResult = await analyzeSchedule(session.userId, functionArgs)
          break
        case "suggest_study_plan":
          functionResult = await suggestStudyPlan(session.userId, functionArgs)
          break
        default:
          functionResult = { success: false, message: "Unknown function" }
      }

      // Get final response from AI with function result
      const finalMessages = [
        ...messages,
        assistantMessage,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(functionResult)
        }
      ]

      const finalResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: finalMessages,
          temperature: 0.7,
          max_tokens: 500
        })
      })

      const finalData = await finalResponse.json()
      const finalMessage = finalData.choices[0]?.message?.content

      return NextResponse.json({
        response: finalMessage,
        action: {
          type: functionName,
          params: functionArgs,
          result: functionResult
        }
      })
    }

    // No function call, just return the AI response
    return NextResponse.json({
      response: assistantMessage.content
    })

  } catch (e) {
    console.error("Chat API error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to process message" },
      { status: 500 }
    )
  }
}
