import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Settings keys we support
const SETTINGS_KEYS = [
  'ai_enabled',
  'ai_system_prompt',
  'human_takeover_keywords',
  'ai_greeting_message',
  'ai_closing_message',
  'ai_language',
  'ai_response_tone',
  'prohibited_topics',
  'company_name',
  'support_phone',
  'support_email',
  'default_company_id',
]

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user-specific settings, with defaults as fallback
    const rows = await sql`
      SELECT key, value FROM settings 
      WHERE user_id = ${session.id} AND key = ANY(${SETTINGS_KEYS})
    `
    
    // Convert key-value rows to object with defaults
    const settings: Record<string, string | boolean> = {
      company_name: '',
      support_phone: '',
      support_email: '',
      ai_enabled: true,
      ai_system_prompt: '',
      human_takeover_keywords: 'human,agent,support,help',
      ai_greeting_message: 'Hello! How can I help you today?',
      ai_closing_message: 'Thank you for chatting with us. Have a great day!',
      ai_language: 'en',
      ai_response_tone: 'friendly',
      prohibited_topics: '',
      default_company_id: '',
    }
    
    for (const row of rows) {
      if (row.key === 'ai_enabled') {
        settings[row.key] = row.value === 'true'
      } else {
        settings[row.key] = row.value
      }
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Upsert each setting for this user
    for (const key of SETTINGS_KEYS) {
      if (data[key] !== undefined) {
        const value = typeof data[key] === 'boolean' ? String(data[key]) : data[key]
        await sql`
          INSERT INTO settings (user_id, key, value, updated_at)
          VALUES (${session.id}, ${key}, ${value}, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = CURRENT_TIMESTAMP
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
