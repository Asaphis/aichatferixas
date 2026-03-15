import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (companyId) {
      const products = await sql`SELECT * FROM products WHERE company_id = ${companyId} ORDER BY created_at DESC`
      return NextResponse.json(products)
    }

    const products = await sql`SELECT * FROM products ORDER BY created_at DESC`
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company_id, name, description, price, category } = body

    const result = await sql`
      INSERT INTO products (company_id, name, description, price, category)
      VALUES (${company_id}, ${name}, ${description || null}, ${price || null}, ${category || null})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
