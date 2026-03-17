import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'

async function getContacts() {
  const session = await getSession()
  if (!session) {
    return []
  }

  // Filter by user_id - super_admin sees all, others see their own
  if (session.role === 'super_admin') {
    const contacts = await sql`
      SELECT 
        ct.id, 
        ct.phone, 
        ct.name, 
        ct.created_at,
        c.last_message,
        c.updated_at as last_activity,
        c.status
      FROM contacts ct
      LEFT JOIN conversations c ON ct.id = c.contact_id
      ORDER BY c.updated_at DESC NULLS LAST, ct.created_at DESC
    `
    return contacts
  } else {
    const contacts = await sql`
      SELECT 
        ct.id, 
        ct.phone, 
        ct.name, 
        ct.created_at,
        c.last_message,
        c.updated_at as last_activity,
        c.status
      FROM contacts ct
      LEFT JOIN conversations c ON ct.id = c.contact_id
      WHERE ct.user_id = ${session.id}
      ORDER BY c.updated_at DESC NULLS LAST, ct.created_at DESC
    `
    return contacts
  }
}

export default async function ContactsPage() {
  const contacts = await getContacts()

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <p className="text-muted-foreground">All customers who have sent messages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
          <CardDescription>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No contacts yet</p>
              <p className="text-muted-foreground">
                Contacts will appear here when customers message you on WhatsApp
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.phone}</TableCell>
                    <TableCell>{contact.name || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {contact.last_message || '-'}
                    </TableCell>
                    <TableCell>
                      {contact.last_activity
                        ? new Date(contact.last_activity).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.status ? (
                        <Badge variant={contact.status === 'AI' ? 'secondary' : 'default'}>
                          {contact.status}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
