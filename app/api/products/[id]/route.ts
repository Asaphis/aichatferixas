import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

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
    const { name, description, price, category } = body

    let result
    if (session.role === 'super_admin') {
      result = await sql`
        UPDATE products 
        SET name = ${name}, 
            description = ${description || null}, 
            price = ${price || null}, 
            category = ${category || null}
        WHERE id = ${id}
        RETURNING *
      `
    } else {
      result = await sql`
        UPDATE products 
        SET name = ${name}, 
            description = ${description || null}, 
            price = ${price || null}, 
            category = ${category || null}
        WHERE id = ${id} AND user_id = ${session.id}
        RETURNING *
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
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

    if (session.role === 'super_admin') {
      await sql`DELETE FROM products WHERE id = ${id}`
    } else {
      await sql`DELETE FROM products WHERE id = ${id} AND user_id = ${session.id}`
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
