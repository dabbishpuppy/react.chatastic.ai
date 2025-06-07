
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { texts, model = 'text-embedding-3-small', provider = 'openai' } = await req.json()

    if (!texts || !Array.isArray(texts)) {
      throw new Error('texts array is required')
    }

    let embeddings: number[][] = []

    switch (provider) {
      case 'openai':
        embeddings = await generateOpenAIEmbeddings(texts, model)
        break
      case 'cohere':
        embeddings = await generateCohereEmbeddings(texts, model)
        break
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({
        embeddings,
        model,
        provider,
        usage: {
          total_tokens: texts.reduce((sum, text) => sum + text.split(' ').length, 0)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-embeddings function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function generateOpenAIEmbeddings(texts: string[], model: string): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

async function generateCohereEmbeddings(texts: string[], model: string): Promise<number[][]> {
  const cohereApiKey = Deno.env.get('COHERE_API_KEY')
  if (!cohereApiKey) {
    throw new Error('COHERE_API_KEY is not configured')
  }

  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cohereApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts,
      model: model || 'embed-english-v3.0',
      input_type: 'search_document'
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cohere API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.embeddings
}
