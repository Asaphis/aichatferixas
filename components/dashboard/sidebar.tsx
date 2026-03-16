'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react' from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/dashboard/ai-config', label: 'AI Config', icon: Sparkles },
  { href: '/dashboard/users', label: 'Users', icon: ShieldCheck, roles: ['super_admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">KRYROS</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter((item) => {
            if (!item.roles) return true
            return item.roles.includes(user.role)
          })
          .map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs mt-1">
            <span className={user.role === 'super_admin' ? 'text-purple-600 font-medium' : ''}>
              {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Agent'}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
