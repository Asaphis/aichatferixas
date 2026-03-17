import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id } = body

    // First, deactivate all companies for this user
    if (session.role === 'super_admin') {
      await sql`UPDATE companies SET is_active = false`
    } else {
      await sql`UPDATE companies SET is_active = false WHERE user_id = ${session.id}`
    }

    // Then activate the selected company (if it belongs to this user)
    if (company_id) {
      if (session.role === 'super_admin') {
        await sql`UPDATE companies SET is_active = true WHERE id = ${company_id}`
      } else {
        await sql`UPDATE companies SET is_active = true WHERE id = ${company_id} AND user_id = ${session.id}`
      }
    }

    // Update the default_company_id setting for this user
    await sql`
      INSERT INTO settings (user_id, key, value) VALUES (${session.id}, 'default_company_id', ${company_id || ''})
      ON CONFLICT (user_id, key) DO UPDATE SET value = ${company_id || ''}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting active company:', error)
    return NextResponse.json({ error: 'Failed to set active company' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the active company for this user
    let companies
    if (session.role === 'super_admin') {
      companies = await sql`SELECT * FROM companies WHERE is_active = true LIMIT 1`
    } else {
      companies = await sql`SELECT * FROM companies WHERE user_id = ${session.id} AND is_active = true LIMIT 1`
    }
    
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
