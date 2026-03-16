'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Save, Bot, MessageSquare, HelpCircle, Settings, Sparkles } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface QuickReply {
  id?: number
  question: string
  answer: string
  category: string
}

interface FAQ {
  id?: number
  question: string
  answer: string
  category: string
}

export default function AIConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Settings state
  const [settings, setSettings] = useState({
    ai_enabled: true,
    ai_system_prompt: '',
    human_takeover_keywords: 'human,agent,support,help,talk to human',
    ai_greeting_message: 'Hello! How can I help you today?',
    ai_closing_message: 'Thank you for chatting with us. Have a great day!',
    ai_language: 'en',
    ai_response_tone: 'friendly',
    prohibited_topics: '',
  })

  // Quick replies state
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [newQuickReply, setNewQuickReply] = useState<QuickReply>({ question: '', answer: '', category: 'General' })

  // FAQs state
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '', category: 'General' })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai-config')
      if (res.ok) {
        const data = await res.json()
        
        // Merge settings with defaults
        setSettings({
          ai_enabled: data.settings?.ai_enabled === 'true' || data.settings?.ai_enabled === true,
          ai_system_prompt: data.settings?.ai_system_prompt || '',
          human_takeover_keywords: data.settings?.human_takeover_keywords || 'human,agent,support,help',
          ai_greeting_message: data.settings?.ai_greeting_message || 'Hello! How can I help you today?',
          ai_closing_message: data.settings?.ai_closing_message || 'Thank you for chatting with us. Have a great day!',
          ai_language: data.settings?.ai_language || 'en',
          ai_response_tone: data.settings?.ai_response_tone || 'friendly',
          prohibited_topics: data.settings?.prohibited_topics || '',
        })

        setQuickReplies(data.quickReplies || [])
        setFaqs(data.faqs || [])
      }
    } catch (error) {
      console.error('Error fetching AI config:', error)
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          quickReplies,
          faqs,
        }),
      })

      if (res.ok) {
        setMessage('Configuration saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage('Failed to save configuration')
    }
    setIsSaving(false)
  }

  const addQuickReply = () => {
    if (newQuickReply.question && newQuickReply.answer) {
      setQuickReplies([...quickReplies, { ...newQuickReply }])
      setNewQuickReply({ question: '', answer: '', category: 'General' })
    }
  }

  const removeQuickReply = (index: number) => {
    setQuickReplies(quickReplies.filter((_, i) => i !== index))
  }

  const addFaq = () => {
    if (newFaq.question && newFaq.answer) {
      setFaqs([...faqs, { ...newFaq }])
      setNewFaq({ question: '', answer: '', category: 'General' })
    }
  }

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI Configuration
          </h1>
          <p className="text-muted-foreground">Control how your AI assistant behaves and responds</p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
            <Badge variant={message.includes('success') ? 'default' : 'destructive'}>
              {message}
            </Badge>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="quick-replies">Quick Replies</TabsTrigger>
          <TabsTrigger value="faq">FAQ Knowledge</TabsTrigger>
          <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General AI Settings
              </CardTitle>
              <CardDescription>Basic settings to control your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">Turn AI on/off for automatic responses</p>
                </div>
                <Switch
                  checked={settings.ai_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, ai_enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Response Language</Label>
                  <Select
                    value={settings.ai_language}
                    onValueChange={(value) => setSettings({ ...settings, ai_language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="zu">Zulu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Response Tone</Label>
                  <Select
                    value={settings.ai_response_tone}
                    onValueChange={(value) => setSettings({ ...settings, ai_response_tone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Human Takeover Keywords</Label>
                <Input
                  value={settings.human_takeover_keywords}
                  onChange={(e) => setSettings({ ...settings, human_takeover_keywords: e.target.value })}
                  placeholder="human,agent,support,talk to human"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Words that trigger human agent takeover (comma separated)
                </p>
              </div>

              <div>
                <Label>Greeting Message</Label>
                <Textarea
                  value={settings.ai_greeting_message}
                  onChange={(e) => setSettings({ ...settings, ai_greeting_message: e.target.value })}
                  placeholder="Hello! How can I help you today?"
                  rows={2}
                />
              </div>

              <div>
                <Label>Closing Message</Label>
                <Textarea
                  value={settings.ai_closing_message}
                  onChange={(e) => setSettings({ ...settings, ai_closing_message: e.target.value })}
                  placeholder="Thank you for chatting with us. Have a great day!"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personality & Instructions */}
        <TabsContent value="personality">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Personality & Instructions
              </CardTitle>
              <CardDescription>
                Define how your AI assistant behaves, what it says, and how it represents your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>System Prompt (AI Instructions)</Label>
                <Textarea
                  value={settings.ai_system_prompt}
                  onChange={(e) => setSettings({ ...settings, ai_system_prompt: e.target.value })}
                  placeholder={`You are a professional customer support representative for [Your Company Name].

Your role:
- Help customers with their inquiries about products and services
- Provide accurate information about pricing, features, and availability
- Be friendly, patient, and helpful at all times
- Escalate complex issues to a human agent when needed

Guidelines:
- Always be polite and professional
- Keep responses concise but informative
- If you don't know something, admit it and offer to find out
- Never make up information`}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This tells the AI exactly who it is, what to do, and how to behave. Be specific!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Replies */}
        <TabsContent value="quick-replies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Quick Replies
              </CardTitle>
              <CardDescription>
                Pre-defined responses for common questions. The AI will use these when matching questions are asked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Question/Trigger</Label>
                  <Input
                    value={newQuickReply.question}
                    onChange={(e) => setNewQuickReply({ ...newQuickReply, question: e.target.value })}
                    placeholder="e.g., What are your hours?"
                  />
                </div>
                <div>
                  <Label>Answer/Response</Label>
                  <Input
                    value={newQuickReply.answer}
                    onChange={(e) => setNewQuickReply({ ...newQuickReply, answer: e.target.value })}
                    placeholder="e.g., We're open 9AM-5PM Mon-Fri"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newQuickReply.category}
                      onChange={(e) => setNewQuickReply({ ...newQuickReply, category: e.target.value })}
                      placeholder="General"
                    />
                    <Button onClick={addQuickReply} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {quickReplies.map((qr, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{qr.question}</p>
                      <p className="text-sm text-muted-foreground">{qr.answer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{qr.category}</Badge>
                      <Button variant="destructive" size="sm" onClick={() => removeQuickReply(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {quickReplies.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No quick replies added yet. Add your first one above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Knowledge Base */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                FAQ Knowledge Base
              </CardTitle>
              <CardDescription>
                Common questions and answers the AI can reference to provide accurate information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Question</Label>
                  <Input
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    placeholder="e.g., Do you offer refunds?"
                  />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Input
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    placeholder="e.g., Yes, we offer 30-day refunds"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFaq.category}
                      onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                      placeholder="Billing"
                    />
                    <Button onClick={addFaq} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{faq.question}</p>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{faq.category}</Badge>
                      <Button variant="destructive" size="sm" onClick={() => removeFaq(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No FAQs added yet. Add your first one above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restrictions */}
        <TabsContent value="restrictions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                AI Restrictions & Safety
              </CardTitle>
              <CardDescription>
                Control what topics the AI should avoid or handle carefully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Prohibited Topics</Label>
                <Textarea
                  value={settings.prohibited_topics}
                  onChange={(e) => setSettings({ ...settings, prohibited_topics: e.target.value })}
                  placeholder={`Enter topics the AI should not discuss:
- Political topics
- Religious beliefs
- Competitor products
- Internal company matters
- Personal employee information`}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The AI will politely decline to discuss these topics and suggest contacting human support.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
