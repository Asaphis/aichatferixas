import { NextResponse } from 'next/server'
import { connectToWhatsApp } from '@/lib/whatsapp'
import { getSession } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToWhatsApp(session.id)
    return NextResponse.json({
      success: true,
      message: 'WhatsApp connection initiated.',
    })
  } catch (error) {
    console.error('Failed to connect WhatsApp:', error)
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp' },
      { status: 500 }
    )
  }
}
