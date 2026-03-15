import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const companies = await sql`SELECT * FROM companies ORDER BY created_at DESC`
    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, phone, email, address, website, is_active } = body

    const result = await sql`
      INSERT INTO companies (name, description, phone, email, address, website, is_active)
      VALUES (${name}, ${description || null}, ${phone || null}, ${email || null}, ${address || null}, ${website || null}, ${is_active || false})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
