import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/22.0.1207.1 Safari/537.1",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:55.0) Gecko/20100101 Firefox/55.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/22.0.1207.1 Safari/537.1",
  "Mozilla/5.0 (X11; CrOS i686 2268.111.0) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1092.0 Safari/536.6",
  "Mozilla/5.0 (Windows NT 6.0) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.36 Safari/536.5",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
  "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_0) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1062.0 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1062.0 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
  "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6",
  "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/19.77.34.5 Safari/537.1",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.9 Safari/536.5",
  "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3 (KHTML, like Gecko) Chrome/19.0.1061.0 Safari/536.3",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.24 (KHTML, like Gecko) Chrome/19.0.1055.1 Safari/535.24",
  "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/535.24 (KHTML, like Gecko) Chrome/19.0.1055.1 Safari/535.24"
]

function makeHeader() {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }
}

async function searchPubMed(criteria: any) {
  console.log('Searching PubMed with criteria:', criteria)
  
  let searchQuery = ''
  if (criteria.disease) searchQuery += `${criteria.disease}[Title/Abstract] `
  if (criteria.medicine) searchQuery += `AND ${criteria.medicine}[Title/Abstract] `
  if (criteria.working_mechanism) searchQuery += `AND ${criteria.working_mechanism}[Title/Abstract] `
  if (criteria.population) searchQuery += `AND ${criteria.population}[Title/Abstract] `
  if (criteria.trial_type) searchQuery += `AND ${criteria.trial_type}[Publication Type] `
  
  searchQuery = searchQuery.trim().replace(/^AND\s+/, '')
  
  if (!searchQuery) {
    throw new Error('No search criteria provided')
  }

  const baseUrl = 'https://pubmed.ncbi.nlm.nih.gov'
  const searchUrl = `${baseUrl}/?term=${encodeURIComponent(searchQuery)}&size=10`
  
  console.log('Search URL:', searchUrl)
  
  try {
    const headers = makeHeader()
    const response = await fetch(searchUrl, { headers })
    const html = await response.text()
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    const articles = []
    const articleElements = doc.querySelectorAll('.docsum-content')
    
    for (const element of articleElements) {
      try {
        const titleElement = element.querySelector('.docsum-title')
        const title = titleElement?.textContent?.trim() || 'No title'
        
        const authorElement = element.querySelector('.docsum-authors')
        const authors = authorElement?.textContent?.split(',').map(a => a.trim()) || []
        
        const journalElement = element.querySelector('.docsum-journal-citation')
        const journalText = journalElement?.textContent || ''
        const journal = journalText.split('.')[0] || 'No journal'
        
        const yearMatch = journalText.match(/\d{4}/)
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear()
        
        const abstractElement = element.querySelector('.full-view-snippet')
        const abstract = abstractElement?.textContent?.trim() || ''

        const idElement = element.querySelector('a')
        const id = idElement?.getAttribute('href')?.replace('/', '') || ''

        articles.push({
          id,
          title,
          authors,
          journal,
          year,
          abstract,
          citations: 0 // Default value as citations require additional API calls
        })
      } catch (error) {
        console.error('Error processing article:', error)
        continue
      }
    }
    
    console.log(`Found ${articles.length} articles`)
    return articles
    
  } catch (error) {
    console.error('Error searching PubMed:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const searchCriteria = await req.json()
    console.log('Received search criteria:', searchCriteria)

    const papers = await searchPubMed(searchCriteria)

    return new Response(
      JSON.stringify({ 
        success: true,
        papers
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
