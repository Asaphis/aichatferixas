import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Bot, UserCheck } from 'lucide-react'

async function getStats() {
  const session = await getSession()
  if (!session) {
    return {
      totalConversations: 0,
      totalContacts: 0,
      aiHandled: 0,
      humanHandled: 0,
    }
  }

  // Filter by user_id - super_admin sees all, others see their own
  let result
  if (session.role === 'super_admin') {
    result = await Promise.all([
      sql`SELECT COUNT(*) as count FROM conversations`,
      sql`SELECT COUNT(*) as count FROM contacts`,
      sql`SELECT COUNT(*) as count FROM conversations WHERE status = 'AI'`,
      sql`SELECT COUNT(*) as count FROM conversations WHERE status = 'HUMAN'`,
    ])
  } else {
    result = await Promise.all([
      sql`SELECT COUNT(*) as count FROM conversations WHERE user_id = ${session.id}`,
      sql`SELECT COUNT(*) as count FROM contacts WHERE user_id = ${session.id}`,
      sql`SELECT COUNT(*) as count FROM conversations WHERE user_id = ${session.id} AND status = 'AI'`,
      sql`SELECT COUNT(*) as count FROM conversations WHERE user_id = ${session.id} AND status = 'HUMAN'`,
    ])
  }

  return {
    totalConversations: Number(result[0][0]?.count || 0),
    totalContacts: Number(result[1][0]?.count || 0),
    aiHandled: Number(result[2][0]?.count || 0),
    humanHandled: Number(result[3][0]?.count || 0),
  }
}

async function getRecentConversations() {
  const session = await getSession()
  if (!session) {
    return []
  }

  // Filter by user_id - super_admin sees all, others see their own
  let conversations
  if (session.role === 'super_admin') {
    conversations = await sql`
      SELECT c.id, c.status, c.last_message, c.updated_at, ct.name, ct.phone
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      ORDER BY c.updated_at DESC
      LIMIT 5
    `
  } else {
    conversations = await sql`
      SELECT c.id, c.status, c.last_message, c.updated_at, ct.name, ct.phone
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.user_id = ${session.id}
      ORDER BY c.updated_at DESC
      LIMIT 5
    `
  }
  return conversations
}

export default async function DashboardPage() {
  const stats = await getStats()
  const recentConversations = await getRecentConversations()

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to AGENT FERIXAS Support Dashboard</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">All customer chats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">Unique customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Handled</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiHandled}</div>
            <p className="text-xs text-muted-foreground">Automated responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Human Handled</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.humanHandled}</div>
            <p className="text-xs text-muted-foreground">Agent responses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Latest customer interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No conversations yet. Connect WhatsApp to start receiving messages.
            </p>
          ) : (
            <div className="space-y-4">
              {recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{conv.name || conv.phone}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {conv.last_message || 'No messages'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        conv.status === 'AI'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      )}
                    >
                      {conv.status}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
