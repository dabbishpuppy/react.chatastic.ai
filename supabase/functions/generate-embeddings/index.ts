
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sourceId, texts, model = 'text-embedding-3-small', provider = 'openai' } = await req.json()

    let textsToProcess: string[] = []

    if (sourceId) {
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      console.log(`🤖 Fetching chunks for source: ${sourceId}`)

      // Fetch chunks for this source
      const { data: chunks, error: chunksError } = await supabase
        .from('source_chunks')
        .select('id, content')
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true })

      if (chunksError) {
        console.error('❌ Failed to fetch chunks:', chunksError)
        throw new Error(`Failed to fetch chunks: ${chunksError.message}`)
      }

      if (!chunks || chunks.length === 0) {
        console.log('⚠️ No chunks found for source:', sourceId)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No chunks found to process',
            processedCount: 0,
            errorCount: 0,
            totalChunks: 0
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      console.log(`📦 Found ${chunks.length} chunks to process`)
      textsToProcess = chunks.map(chunk => chunk.content).filter(content => content && content.trim().length > 0)

      if (textsToProcess.length === 0) {
        console.log('⚠️ No valid content found in chunks')
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No valid content found in chunks',
            processedCount: 0,
            errorCount: 0,
            totalChunks: chunks.length
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      console.log(`🔤 Processing ${textsToProcess.length} valid texts`)

      // Generate embeddings for the texts
      let embeddings: number[][] = []
      
      try {
        switch (provider) {
          case 'openai':
            embeddings = await generateOpenAIEmbeddings(textsToProcess, model)
            break
          case 'cohere':
            embeddings = await generateCohereEmbeddings(textsToProcess, model)
            break
          default:
            throw new Error(`Unsupported embedding provider: ${provider}`)
        }
      } catch (embeddingError) {
        console.error('❌ Failed to generate embeddings:', embeddingError)
        throw new Error(`Failed to generate embeddings: ${embeddingError.message}`)
      }

      console.log(`✅ Generated ${embeddings.length} embeddings`)

      // Store embeddings in the database
      let processedCount = 0
      let errorCount = 0

      for (let i = 0; i < chunks.length && i < embeddings.length; i++) {
        try {
          const chunk = chunks[i]
          const embedding = embeddings[i]

          // Store embedding
          const { error: embeddingError } = await supabase
            .from('source_embeddings')
            .upsert({
              chunk_id: chunk.id,
              embedding: `[${embedding.join(',')}]`, // Store as string format
              model_name: model
            }, {
              onConflict: 'chunk_id'
            })

          if (embeddingError) {
            console.error(`❌ Failed to store embedding for chunk ${chunk.id}:`, embeddingError)
            errorCount++
          } else {
            processedCount++
          }
        } catch (error) {
          console.error(`❌ Error processing chunk ${chunks[i].id}:`, error)
          errorCount++
        }
      }

      console.log(`📊 Processing complete: ${processedCount} successful, ${errorCount} errors`)

      return new Response(
        JSON.stringify({
          success: true,
          processedCount,
          errorCount,
          totalChunks: chunks.length,
          model,
          provider
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } else if (texts && Array.isArray(texts)) {
      // Original functionality - process provided texts array
      textsToProcess = texts
    } else {
      throw new Error('Either sourceId or texts array is required')
    }

    // Generate embeddings for provided texts
    let embeddings: number[][] = []

    switch (provider) {
      case 'openai':
        embeddings = await generateOpenAIEmbeddings(textsToProcess, model)
        break
      case 'cohere':
        embeddings = await generateCohereEmbeddings(textsToProcess, model)
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
          total_tokens: textsToProcess.reduce((sum, text) => sum + text.split(' ').length, 0)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-embeddings function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
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
