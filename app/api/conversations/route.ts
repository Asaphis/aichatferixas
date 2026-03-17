import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter by user_id - super_admin sees all, others see their own
    let conversations
    if (session.role === 'super_admin') {
      conversations = await sql`
        SELECT c.id, c.status, c.last_message, c.updated_at, ct.name, ct.phone
        FROM conversations c
        JOIN contacts ct ON c.contact_id = ct.id
        ORDER BY c.updated_at DESC
      `
    } else {
      conversations = await sql`
        SELECT c.id, c.status, c.last_message, c.updated_at, ct.name, ct.phone
        FROM conversations c
        JOIN contacts ct ON c.contact_id = ct.id
        WHERE c.user_id = ${session.id}
        ORDER BY c.updated_at DESC
      `
    }
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
