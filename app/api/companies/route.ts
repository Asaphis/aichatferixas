import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Super admin sees all companies, others see only their own
    if (session.role === 'super_admin') {
      const companies = await sql`SELECT * FROM companies ORDER BY created_at DESC`
      return NextResponse.json(companies)
    } else {
      const companies = await sql`SELECT * FROM companies WHERE user_id = ${session.id} ORDER BY created_at DESC`
      return NextResponse.json(companies)
    }
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, phone, email, address, website, is_active } = body

    const result = await sql`
      INSERT INTO companies (user_id, name, description, phone, email, address, website, is_active)
      VALUES (${session.id}, ${name}, ${description || null}, ${phone || null}, ${email || null}, ${address || null}, ${website || null}, ${is_active || false})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
