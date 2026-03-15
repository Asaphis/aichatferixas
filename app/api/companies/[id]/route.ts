import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companies = await sql`SELECT * FROM companies WHERE id = ${id}`
    
    if (companies.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get products for this company
    const products = await sql`SELECT * FROM products WHERE company_id = ${id}`
    
    return NextResponse.json({
      ...companies[0],
      products
    })
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, phone, email, address, website, is_active } = body

    const result = await sql`
      UPDATE companies 
      SET name = ${name}, 
          description = ${description || null}, 
          phone = ${phone || null}, 
          email = ${email || null}, 
          address = ${address || null}, 
          website = ${website || null}, 
          is_active = ${is_active || false},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM companies WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
