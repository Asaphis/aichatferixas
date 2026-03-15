import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the website
    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch website' }, { status: 400 })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove scripts, styles, and navigation
    $('script, style, nav, header, footer, aside').remove()

    // Extract title
    const title = $('title').text().trim()

    // Extract main content
    const mainContent = $('main, article, .content, .main, #content').first().text().trim()

    // Extract all headings and paragraphs
    const content: string[] = []
    
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim()
      if (text) content.push(`## ${text}`)
    })

    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 20) content.push(text)
    })

    // Try to extract product-like information
    const products: { name: string; description: string; price?: string }[] = []
    
    // Look for product cards, pricing tables, etc.
    $('.product, .item, .service, [class*="product"], [class*="item"]').each((_, el) => {
      const name = $(el).find('h1, h2, h3, h4, h5, h6, .title, .name').first().text().trim()
      const description = $(el).find('p, .description, .desc').first().text().trim()
      const price = $(el).find('.price, [class*="price"]').first().text().trim()
      
      if (name && name.length > 2) {
        products.push({
          name,
          description,
          price: price || undefined
        })
      }
    })

    // Extract links (might contain products/services pages)
    const links: string[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && (href.includes('product') || href.includes('service') || href.includes('shop'))) {
        try {
          const fullUrl = new URL(href, validUrl.origin).toString()
          if (!links.includes(fullUrl)) {
            links.push(fullUrl)
          }
        } catch {}
      }
    })

    // Get meta description
    const metaDescription = $('meta[name="description"]').attr('content') || ''

    return NextResponse.json({
      url: validUrl.toString(),
      title,
      metaDescription,
      content: content.slice(0, 50).join('\n\n'), // Limit content
      products: products.slice(0, 20), // Limit products
      relatedLinks: links.slice(0, 10),
    })
  } catch (error) {
    console.error('Error scraping website:', error)
    return NextResponse.json({ error: 'Failed to scrape website' }, { status: 500 })
  }
}
