import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (companyId) {
      // Get products for a specific company (that belongs to this user)
      if (session.role === 'super_admin') {
        const products = await sql`SELECT * FROM products WHERE company_id = ${companyId} ORDER BY created_at DESC`
        return NextResponse.json(products)
      } else {
        const products = await sql`
          SELECT p.* FROM products p
          JOIN companies c ON p.company_id = c.id
          WHERE p.company_id = ${companyId} AND c.user_id = ${session.id}
          ORDER BY p.created_at DESC
        `
        return NextResponse.json(products)
      }
    }

    // Get all products for this user
    if (session.role === 'super_admin') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`
      return NextResponse.json(products)
    } else {
      const products = await sql`
        SELECT p.* FROM products p
        JOIN companies c ON p.company_id = c.id
        WHERE c.user_id = ${session.id}
        ORDER BY p.created_at DESC
      `
      return NextResponse.json(products)
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, name, description, price, category } = body

    // Verify the company belongs to this user
    if (session.role !== 'super_admin') {
      const companies = await sql`SELECT id FROM companies WHERE id = ${company_id} AND user_id = ${session.id}`
      if (companies.length === 0) {
        return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 })
      }
    }

    const result = await sql`
      INSERT INTO products (user_id, company_id, name, description, price, category)
      VALUES (${session.id}, ${company_id}, ${name}, ${description || null}, ${price || null}, ${category || null})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
