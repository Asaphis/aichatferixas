import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessageKey
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import QRCode from 'qrcode-svg'
import { sql } from './db'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// In-memory status for real-time dashboard updates
const globalForWhatsApp = global as unknown as {
  whatsappStatus: {
    connected: boolean
    qrCode: string | null
    phone: string | null
    error: string | null
    ownerUserId: number | null  // The user who owns this WhatsApp connection
  }
  sock: any
}

export const whatsappStatus = globalForWhatsApp.whatsappStatus || {
  connected: false,
  qrCode: null,
  phone: null,
  error: null,
  ownerUserId: null,
}

if (process.env.NODE_ENV !== 'production') {
  globalForWhatsApp.whatsappStatus = whatsappStatus
}

let sock: any = globalForWhatsApp.sock || null
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth')

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
}

export const getWhatsAppStatus = () => whatsappStatus

export const connectToWhatsApp = async (ownerUserId?: number) => {
  if (sock) {
    console.log('Closing existing WhatsApp connection...')
    try {
      await sock.logout()
    } catch (e) {
      console.log('Error logging out from existing sock:', e)
    }
    sock.ev.removeAllListeners('connection.update')
    sock.ev.removeAllListeners('creds.update')
    sock.ev.removeAllListeners('messages.upsert')
  }

  // Set the owner user ID (default to 1 if not provided)
  whatsappStatus.ownerUserId = ownerUserId || 1

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      logger: pino({ level: 'silent' }),
    })

    if (process.env.NODE_ENV !== 'production') {
      globalForWhatsApp.sock = sock
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update
      console.log('WhatsApp connection update:', { connection, qr: !!qr })

      if (qr) {
        console.log('Generating QR code SVG...')
        const qrSvg = new QRCode(qr).svg()
        // Convert SVG to data URL for display in img tag
        const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`
        whatsappStatus.qrCode = qrDataUrl
        whatsappStatus.connected = false
        whatsappStatus.error = null
        console.log('QR code generated and stored.')
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        whatsappStatus.connected = false
        whatsappStatus.qrCode = null
        whatsappStatus.phone = null
        
        if (shouldReconnect) {
          connectToWhatsApp()
        } else {
          whatsappStatus.error = 'Logged out. Please scan QR code again.'
        }
      } else if (connection === 'open') {
        whatsappStatus.connected = true
        whatsappStatus.qrCode = null
        whatsappStatus.phone = sock.user.id.split(':')[0]
        whatsappStatus.error = null
        console.log('WhatsApp connection opened!')
        
        // Load existing chats and messages
        loadExistingChats()
      }
    })

    sock.ev.on('messages.upsert', async (m: any) => {
      const msg = m.messages[0]
      if (!msg.key.fromMe && m.type === 'notify') {
        await handleIncomingMessage(msg)
      }
    })

    return sock
  } catch (error) {
    console.error('Error connecting to WhatsApp:', error)
    whatsappStatus.error = `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    throw error
  }
}

async function handleIncomingMessage(msg: any) {
  const senderId = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
  
  if (!text) return

  const phone = senderId.split('@')[0]
  
  try {
    // 1. Get or create contact
    let contacts = await sql`SELECT id, name FROM contacts WHERE phone = ${phone}`
    let contactId: number
    const ownerUserId = whatsappStatus.ownerUserId || 1

    if (contacts.length === 0) {
      const newContact = await sql`INSERT INTO contacts (user_id, phone, name) VALUES (${ownerUserId}, ${phone}, ${msg.pushName || 'WhatsApp User'}) RETURNING id`
      contactId = newContact[0].id
    } else {
      contactId = contacts[0].id
    }

    // 2. Get active company ID
    const activeCompany = await sql`SELECT id FROM companies WHERE is_active = true LIMIT 1`
    const companyId = activeCompany.length > 0 ? activeCompany[0].id : null

    // 3. Get or create conversation
    let conversations = await sql`SELECT id, status FROM conversations WHERE contact_id = ${contactId}`
    let conversationId: number
    let status: 'AI' | 'HUMAN'

    if (conversations.length === 0) {
      const newConversation = await sql`INSERT INTO conversations (user_id, contact_id, company_id, status) VALUES (${ownerUserId}, ${contactId}, ${companyId}, 'AI') RETURNING id, status`
      conversationId = newConversation[0].id
      status = 'AI'
    } else {
      conversationId = conversations[0].id
      status = conversations[0].status
    }

    // 3. Save incoming message
    await sql`INSERT INTO messages (conversation_id, sender, content) VALUES (${conversationId}, 'customer', ${text})`
    await sql`UPDATE conversations SET last_message = ${text}, updated_at = CURRENT_TIMESTAMP WHERE id = ${conversationId}`

    // 4. Handle AI response if in AI mode
    if (status === 'AI') {
      // Check for takeover keywords
      const settings = await sql`SELECT value FROM settings WHERE key = 'human_takeover_keywords'`
      const keywords = (settings[0]?.value || 'human,agent,support,help').split(',').map((k: string) => k.trim().toLowerCase())
      
      const needsTakeover = keywords.some((k: string) => text.toLowerCase().includes(k))

      if (needsTakeover) {
        await sql`UPDATE conversations SET status = 'HUMAN' WHERE id = ${conversationId}`
        await sock.sendMessage(senderId, { text: "I've notified a human agent to help you. One moment please." })
        await sql`INSERT INTO messages (conversation_id, sender, content) VALUES (${conversationId}, 'ai', "I've notified a human agent to help you. One moment please.")`
      } else {
        const response = await getAIResponse(text, conversationId)
        await sock.sendMessage(senderId, { text: response })
        await sql`INSERT INTO messages (conversation_id, sender, content) VALUES (${conversationId}, 'ai', ${response})`
      }
    }
  } catch (err) {
    console.error('Error handling message:', err)
  }
}

// Load existing WhatsApp chats when connected
async function loadExistingChats() {
  if (!sock) return
  
  try {
    console.log('Loading existing WhatsApp chats...')
    const chats = await sock.getChats()
    
    for (const chat of chats) {
      // Skip broadcasts and status
      if (chat.id.includes('broadcast') || chat.id.includes('status')) continue
      
      const phone = chat.id.split('@')[0]
      if (phone === whatsappStatus.phone) continue // Skip self
      
      try {
        // Get or create contact
        let contacts = await sql`SELECT id, name FROM contacts WHERE phone = ${phone}`
        let contactId: number

        if (contacts.length === 0) {
          const newContact = await sql`INSERT INTO contacts (user_id, phone, name) VALUES (${ownerUserId}, ${phone}, ${chat.name || 'WhatsApp User'}) RETURNING id`
          contactId = newContact[0].id
        } else {
          contactId = contacts[0].id
        }

        // Get or create conversation
        let conversations = await sql`SELECT id, status FROM conversations WHERE contact_id = ${contactId}`
        let conversationId: number

        if (conversations.length === 0) {
          const newConversation = await sql`INSERT INTO conversations (contact_id, status) VALUES (${contactId}, 'AI') RETURNING id, status`
          conversationId = newConversation[0].id
        } else {
          conversationId = conversations[0].id
        }

        // Fetch last 50 messages for this chat
        const messages = await sock.fetchMessagesFromWA(chat.id, { limit: 50 })
        
        for (const msg of messages) {
          if (!msg.message) continue
          
          const msgSender = msg.key.fromMe ? 'agent' : 'customer'
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || ''
          
          if (!text) continue
          
          await sql`INSERT INTO messages (conversation_id, sender, content, created_at) VALUES (${conversationId}, ${msgSender}, ${text}, ${new Date(msg.messageTimestamp * 1000).toISOString()})`
        }
        
        // Update last message
        const lastMsg = messages[messages.length - 1]
        if (lastMsg?.message) {
          const text = lastMsg.message?.conversation || lastMsg.message?.extendedTextMessage?.text || lastMsg.message?.imageMessage?.caption || 'Media message'
          await sql`UPDATE conversations SET last_message = ${text}, updated_at = ${new Date(lastMsg.messageTimestamp * 1000).toISOString()} WHERE id = ${conversationId}`
        }
        
        console.log(`Loaded chat for ${phone} with ${messages.length} messages`)
      } catch (err) {
        console.error(`Error loading chat for ${phone}:`, err)
      }
    }
    
    console.log('Finished loading existing chats')
  } catch (err) {
    console.error('Error loading existing chats:', err)
  }
}

async function getAIResponse(userMessage: string, conversationId: number): Promise<string> {
  try {
    // Get the owner user ID from whatsapp status
    const ownerUserId = whatsappStatus.ownerUserId || 1
    
    // 1. Get all AI settings for the owner user
    const settings = await sql`
      SELECT key, value FROM settings 
      WHERE user_id = ${ownerUserId} AND key IN ('ai_enabled', 'ai_system_prompt', 'human_takeover_keywords', 'ai_greeting_message', 'ai_closing_message', 'ai_language', 'ai_response_tone', 'prohibited_topics')
    `
    
    const settingsObj: Record<string, string> = {}
    settings.forEach((s: any) => { settingsObj[s.key] = s.value })

    const aiEnabled = settingsObj.ai_enabled === 'true'
    const systemPrompt = settingsObj.ai_system_prompt || 'You are a helpful assistant.'
    const humanTakeoverKeywords = settingsObj.human_takeover_keywords?.split(',').map(k => k.trim().toLowerCase()) || []
    const greetingMessage = settingsObj.ai_greeting_message || 'Hello! How can I help you today?'
    const closingMessage = settingsObj.ai_closing_message || 'Thank you for chatting with us. Have a great day!'
    const prohibitedTopics = settingsObj.prohibited_topics || ''

    if (!aiEnabled) return "AI is currently disabled."

    // Check if message contains human takeover keywords
    const lowerMessage = userMessage.toLowerCase()
    for (const keyword of humanTakeoverKeywords) {
      if (lowerMessage.includes(keyword)) {
        return "I'll connect you with a human agent right away. Please wait a moment."
      }
    }

    // Check for prohibited topics
    if (prohibitedTopics) {
      const prohibitedList = prohibitedTopics.split('\n').map(t => t.trim().toLowerCase()).filter(t => t)
      for (const topic of prohibitedList) {
        if (topic && lowerMessage.includes(topic)) {
          return "I'm sorry, I'm not able to discuss that topic. For assistance, please contact our support team directly. Is there anything else I can help you with?"
        }
      }
    }

    // 2. Get quick replies for matching
    const quickReplies = await sql`SELECT question, answer FROM quick_replies`
    let quickReplyInfo = ''
    if (quickReplies.length > 0) {
      quickReplyInfo = '\nQuick Reference Answers:\n'
      quickReplies.forEach((qr: any) => {
        quickReplyInfo += `Q: ${qr.question}\nA: ${qr.answer}\n`
      })
    }

    // 3. Get FAQs for knowledge base
    const faqs = await sql`SELECT question, answer FROM faqs`
    let faqInfo = ''
    if (faqs.length > 0) {
      faqInfo = '\nFAQ Knowledge Base:\n'
      faqs.forEach((faq: any) => {
        faqInfo += `Q: ${faq.question}\nA: ${faq.answer}\n`
      })
    }

    // 2. Get active company information
    const companies = await sql`SELECT * FROM companies WHERE is_active = true LIMIT 1`
    let companyInfo = ''
    let productsInfo = ''

    if (companies.length > 0) {
      const company = companies[0]
      companyInfo = `
Company Name: ${company.name}
Company Description: ${company.description || 'N/A'}
Phone: ${company.phone || 'N/A'}
Email: ${company.email || 'N/A'}
Address: ${company.address || 'N/A'}
Website: ${company.website || 'N/A'}
`

      // Get products for this company
      const products = await sql`SELECT name, description, price, category FROM products WHERE company_id = ${company.id}`
      if (products.length > 0) {
        productsInfo = '\nOur Products/Services:\n'
        products.forEach((p: any) => {
          productsInfo += `- ${p.name}: ${p.description || ''} ${p.price ? `(ZMW ${p.price})` : ''}\n`
        })
      }
    }

    // 3. Get recent message history for context
    const history = await sql`
      SELECT sender, content 
      FROM messages 
      WHERE conversation_id = ${conversationId} 
      ORDER BY created_at DESC 
      LIMIT 10
    `
    
    // 4. Build system prompt with all context
    let fullSystemPrompt = systemPrompt
    
    // Add response tone if specified
    if (settingsObj.ai_response_tone) {
      const toneInstructions: Record<string, string> = {
        formal: 'Always use formal language and professional tone.',
        friendly: 'Use friendly and conversational tone.',
        casual: 'Use casual and relaxed tone.',
        professional: 'Use professional but approachable tone.'
      }
      fullSystemPrompt += '\n\n' + (toneInstructions[settingsObj.ai_response_tone] || '')
    }
    
    // Add greeting and closing instructions
    fullSystemPrompt += `\n\nWhen greeting new customers, say: "${greetingMessage}"`
    fullSystemPrompt += `\nWhen ending conversations, say: "${closingMessage}"`
    
    // Add quick replies and FAQs to prompt
    if (quickReplyInfo) {
      fullSystemPrompt += '\n\n' + quickReplyInfo
    }
    if (faqInfo) {
      fullSystemPrompt += '\n\n' + faqInfo
    }

    // 5. Add company and products info to prompt
    if (companyInfo) {
      fullSystemPrompt += '\n\n' + companyInfo
    }
    if (productsInfo) {
      fullSystemPrompt += '\n\n' + productsInfo
    }

    // 6. Build messages array for OpenAI
    const openaiMessages: any[] = [
      { role: 'system', content: fullSystemPrompt },
      ...history.reverse().map((m: any) => ({
        role: m.sender === 'customer' ? 'user' : 'assistant',
        content: m.content
      }))
    ]

    // 7. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
    })

    return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response."
  } catch (err) {
    console.error('OpenAI Error:', err)
    return "I'm having trouble connecting to my AI brain right now. Please try again later."
  }
}

export const disconnectWhatsApp = async () => {
  if (sock) {
    await sock.logout()
    sock = null
    whatsappStatus.connected = false
    whatsappStatus.qrCode = null
    whatsappStatus.phone = null
    whatsappStatus.error = null
  }
}

export const resetWhatsApp = async () => {
  if (sock) {
    await sock.logout()
    sock = null
  }
  whatsappStatus.connected = false
  whatsappStatus.qrCode = null
  whatsappStatus.phone = null
  whatsappStatus.error = null
  
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  }
  await connectToWhatsApp()
}
