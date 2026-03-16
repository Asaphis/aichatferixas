import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Update user (role or password)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can update users
    if (session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied. Super Admin only.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role, password } = body

    // Don't allow changing own super_admin role
    if (parseInt(id) === session.id && role && role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Build update query
    let updateQuery = 'UPDATE users SET '
    const updates: string[] = []
    const values: any[] = []

    if (name) {
      updates.push(`name = $${values.length + 1}`)
      values.push(name)
    }

    if (email) {
      updates.push(`email = $${values.length + 1}`)
      values.push(email)
    }

    if (role) {
      updates.push(`role = $${values.length + 1}`)
      values.push(role)
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push(`password = $${values.length + 1}`)
      values.push(hashedPassword)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(parseInt(id))
    updateQuery += updates.join(', ') + ` WHERE id = $${values.length} RETURNING id, name, email, role, created_at`

    const result = await sql.query(updateQuery, values)

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can delete users
    if (session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied. Super Admin only.' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)

    // Don't allow deleting yourself
    if (userId === session.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await sql`DELETE FROM users WHERE id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
