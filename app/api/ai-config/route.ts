import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Get AI configuration (settings + quick replies + FAQs)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get settings
    const settings = await sql`
      SELECT key, value FROM settings 
      WHERE key LIKE 'ai_%' OR key = 'human_takeover_keywords' OR key = 'prohibited_topics'
    `

    const settingsObj: Record<string, string> = {}
    for (const row of settings) {
      settingsObj[row.key] = row.value
    }

    // Get quick replies
    const quickReplies = await sql`
      SELECT id, question, answer, category FROM quick_replies ORDER BY category, question
    `

    // Get FAQs
    const faqs = await sql`
      SELECT id, question, answer, category FROM faqs ORDER BY category, question
    `

    return NextResponse.json({
      settings: settingsObj,
      quickReplies,
      faqs,
    })
  } catch (error) {
    console.error('Error fetching AI config:', error)
    return NextResponse.json({ error: 'Failed to fetch AI configuration' }, { status: 500 })
  }
}

// Save AI configuration
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { settings, quickReplies, faqs } = data

    // Save settings
    if (settings) {
      const settingKeys = [
        'ai_enabled',
        'ai_system_prompt',
        'human_takeover_keywords',
        'ai_greeting_message',
        'ai_closing_message',
        'ai_language',
        'ai_response_tone',
        'prohibited_topics',
      ]

      for (const key of settingKeys) {
        if (settings[key] !== undefined) {
          const value = typeof settings[key] === 'boolean' ? String(settings[key]) : settings[key]
          await sql`
            INSERT INTO settings (key, value, updated_at)
            VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
          `
        }
      }
    }

    // Save quick replies
    if (quickReplies && Array.isArray(quickReplies)) {
      // Delete existing quick replies
      await sql`DELETE FROM quick_replies`

      // Insert new quick replies
      for (const qr of quickReplies) {
        if (qr.question && qr.answer) {
          await sql`
            INSERT INTO quick_replies (question, answer, category)
            VALUES (${qr.question}, ${qr.answer}, ${qr.category || 'General'})
          `
        }
      }
    }

    // Save FAQs
    if (faqs && Array.isArray(faqs)) {
      // Delete existing FAQs
      await sql`DELETE FROM faqs`

      // Insert new FAQs
      for (const faq of faqs) {
        if (faq.question && faq.answer) {
          await sql`
            INSERT INTO faqs (question, answer, category)
            VALUES (${faq.question}, ${faq.answer}, ${faq.category || 'General'})
          `
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving AI config:', error)
    return NextResponse.json({ error: 'Failed to save AI configuration' }, { status: 500 })
  }
}
