import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Check access - super admin can see all, others can only see their own
    let companies
    if (session.role === 'super_admin') {
      companies = await sql`SELECT * FROM companies WHERE id = ${id}`
    } else {
      companies = await sql`SELECT * FROM companies WHERE id = ${id} AND user_id = ${session.id}`
    }
    
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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, phone, email, address, website, is_active } = body

    // Check access
    let result
    if (session.role === 'super_admin') {
      result = await sql`
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
    } else {
      result = await sql`
        UPDATE companies 
        SET name = ${name}, 
            description = ${description || null}, 
            phone = ${phone || null}, 
            email = ${email || null}, 
            address = ${address || null}, 
            website = ${website || null}, 
            is_active = ${is_active || false},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND user_id = ${session.id}
        RETURNING *
      `
    }

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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check access
    if (session.role === 'super_admin') {
      await sql`DELETE FROM companies WHERE id = ${id}`
    } else {
      await sql`DELETE FROM companies WHERE id = ${id} AND user_id = ${session.id}`
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
