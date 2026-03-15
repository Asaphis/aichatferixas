import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company_id } = body

    // First, deactivate all companies
    await sql`UPDATE companies SET is_active = false`

    // Then activate the selected company
    if (company_id) {
      await sql`UPDATE companies SET is_active = true WHERE id = ${company_id}`
    }

    // Update the default_company_id setting
    await sql`
      INSERT INTO settings (key, value) VALUES ('default_company_id', ${company_id || ''})
      ON CONFLICT (key) DO UPDATE SET value = ${company_id || ''}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting active company:', error)
    return NextResponse.json({ error: 'Failed to set active company' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get the active company
    const companies = await sql`SELECT * FROM companies WHERE is_active = true LIMIT 1`
    
    if (companies.length === 0) {
      return NextResponse.json({ company: null })
    }

    // Get products for the active company
    const products = await sql`SELECT * FROM products WHERE company_id = ${companies[0].id}`

    return NextResponse.json({
      company: companies[0],
      products
    })
  } catch (error) {
    console.error('Error getting active company:', error)
    return NextResponse.json({ error: 'Failed to get active company' }, { status: 500 })
  }
}
