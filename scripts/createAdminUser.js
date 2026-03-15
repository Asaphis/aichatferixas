import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL)

async function createAdminUser() {
  const adminEmail = 'asaphis.org@gmail.com'
  const adminPassword = 'Asaphis@2025'
  const adminName = 'Asaphis'

  // Check if admin already exists
  const existingUsers = await sql`
    SELECT id FROM users WHERE email = ${adminEmail}
  `

  if (existingUsers.length > 0) {
    console.log('Admin user already exists')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // Insert the admin user
  await sql`
    INSERT INTO users (name, email, password, role)
    VALUES (${adminName}, ${adminEmail}, ${hashedPassword}, 'admin')
  `

  console.log('Admin user created successfully')
  console.log('Email:', adminEmail)
  console.log('Password:', adminPassword)
}

createAdminUser().catch(console.error)
