import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CrawlRequest {
  agentId: string
  url: string
  excludePaths?: string[]
  includePaths?: string[]
  respectRobots?: boolean
  maxConcurrentJobs?: number
}

interface CrawlJob {
  id: string
  url: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  parentSourceId: string
  customerId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { agentId, url, excludePaths, includePaths, respectRobots, maxConcurrentJobs }: CrawlRequest = await req.json()

    console.log(`🚀 Starting enhanced crawl for agent ${agentId}, URL: ${url}`)

    // Get customer_id from agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('team_id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found')
    }

    const customerId = agent.team_id

    // Create parent source with enhanced configuration
    const { data: parentSource, error: sourceError } = await supabase
      .from('agent_sources')
      .insert({
        agent_id: agentId,
        team_id: customerId,
        source_type: 'website',
        title: url,
        url: url,
        crawl_status: 'pending',
        exclude_paths: excludePaths || ["/wp-json/*", "/wp-admin/*", "/xmlrpc.php", "/checkout/*", "/cart/*", "/admin/*", "/api/*", "*.json", "*.xml", "*.rss"],
        include_paths: includePaths || [],
        respect_robots: respectRobots ?? true,
        max_concurrent_jobs: maxConcurrentJobs || 5,
        progress: 0,
        metadata: {
          crawl_initiated_at: new Date().toISOString(),
          enhanced_pipeline: true
        }
      })
      .select()
      .single()

    if (sourceError) {
      console.error('Error creating parent source:', sourceError)
      throw sourceError
    }

    console.log(`✅ Created parent source ${parentSource.id}`)

    // Phase 1: Link Discovery
    const discoveredUrls = await discoverLinks(url, excludePaths || [], includePaths || [], respectRobots ?? true)
    
    console.log(`🔍 Discovered ${discoveredUrls.length} URLs to crawl`)

    // Create crawl jobs for each discovered URL
    const crawlJobs = discoveredUrls.map(discoveredUrl => ({
      parent_source_id: parentSource.id,
      customer_id: customerId,
      url: discoveredUrl,
      status: 'pending' as const
    }))

    const { data: createdJobs, error: jobsError } = await supabase
      .from('crawl_jobs')
      .insert(crawlJobs)
      .select()

    if (jobsError) {
      console.error('Error creating crawl jobs:', jobsError)
      throw jobsError
    }

    // Update parent source with total job count and set to in_progress
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'in_progress',
        total_jobs: discoveredUrls.length,
        links_count: discoveredUrls.length,
        progress: 0
      })
      .eq('id', parentSource.id)

    console.log(`📋 Created ${createdJobs?.length} crawl jobs`)

    // Spawn individual crawl jobs asynchronously
    EdgeRuntime.waitUntil(spawnCrawlJobs(createdJobs || []))

    return new Response(
      JSON.stringify({
        success: true,
        parentSourceId: parentSource.id,
        totalJobs: discoveredUrls.length,
        message: 'Crawl initiated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in enhanced crawl:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function discoverLinks(url: string, excludePaths: string[], includePaths: string[], respectRobots: boolean): Promise<string[]> {
  try {
    const baseUrl = new URL(url)
    const discovered = new Set<string>()
    
    // Check robots.txt if required
    let robotsRules: string[] = []
    if (respectRobots) {
      robotsRules = await fetchRobotsRules(baseUrl.origin)
    }

    // Fetch the main page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/1.0 (+https://wonderwave.no/bot)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    const html = await response.text()
    
    // Extract links using regex (basic implementation)
    const linkRegex = /href\s*=\s*["']([^"']+)["']/gi
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const linkUrl = new URL(match[1], baseUrl)
        
        // Only include same-domain links
        if (linkUrl.hostname !== baseUrl.hostname) continue
        
        const fullUrl = linkUrl.href
        const path = linkUrl.pathname
        
        // Check exclude patterns
        if (shouldExcludePath(path, excludePaths)) continue
        
        // Check include patterns (if specified)
        if (includePaths.length > 0 && !shouldIncludePath(path, includePaths)) continue
        
        // Check robots.txt rules
        if (respectRobots && robotsRules.some(rule => path.startsWith(rule))) continue
        
        discovered.add(fullUrl)
        
        // Limit discovery to prevent runaway crawls
        if (discovered.size >= 1000) break
        
      } catch (e) {
        // Invalid URL, skip
        continue
      }
    }

    return Array.from(discovered).slice(0, 500) // Limit to 500 URLs max
    
  } catch (error) {
    console.error('Error discovering links:', error)
    return [url] // Fallback to just the main URL
  }
}

function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1))
    }
    if (pattern.startsWith('*')) {
      return path.endsWith(pattern.slice(1))
    }
    return path === pattern
  })
}

function shouldIncludePath(path: string, includePaths: string[]): boolean {
  return includePaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1))
    }
    if (pattern.startsWith('*')) {
      return path.endsWith(pattern.slice(1))
    }
    return path === pattern
  })
}

async function fetchRobotsRules(origin: string): Promise<string[]> {
  try {
    const robotsResponse = await fetch(`${origin}/robots.txt`)
    if (!robotsResponse.ok) return []
    
    const robotsText = await robotsResponse.text()
    const rules: string[] = []
    
    const lines = robotsText.split('\n')
    let isRelevantSection = false
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()
      if (trimmed.startsWith('user-agent:')) {
        isRelevantSection = trimmed.includes('*') || trimmed.includes('wonderwave')
      } else if (isRelevantSection && trimmed.startsWith('disallow:')) {
        const path = trimmed.replace('disallow:', '').trim()
        if (path) rules.push(path)
      }
    }
    
    return rules
  } catch {
    return []
  }
}

async function spawnCrawlJobs(jobs: CrawlJob[]): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log(`🚀 Spawning ${jobs.length} individual crawl jobs`)

  // Process jobs in batches to avoid overwhelming the system
  const batchSize = 5
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize)
    
    // Process batch concurrently
    await Promise.allSettled(
      batch.map(job => processSingleCrawlJob(job, supabase))
    )
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`✅ Completed spawning all crawl jobs`)
}

async function processSingleCrawlJob(job: CrawlJob, supabase: any): Promise<void> {
  const startTime = Date.now()
  
  try {
    console.log(`🔄 Processing job ${job.id} for URL: ${job.url}`)

    // Update job status to in_progress
    await supabase
      .from('crawl_jobs')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // Fetch and process the page
    const response = await fetch(job.url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/1.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const cleanedContent = cleanHtmlContent(html)
    const chunks = createSemanticChunks(cleanedContent)
    
    console.log(`📝 Created ${chunks.length} chunks for ${job.url}`)

    // Process chunks with global deduplication
    const { uniqueChunks, duplicateChunks, totalCompressedSize } = await processChunksWithDeduplication(
      chunks, 
      job.parentSourceId, 
      supabase
    )

    const processingTime = Date.now() - startTime

    // Update job as completed
    await supabase
      .from('crawl_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        content_size: cleanedContent.length,
        compression_ratio: totalCompressedSize / cleanedContent.length,
        chunks_created: uniqueChunks,
        duplicates_found: duplicateChunks,
        processing_time_ms: processingTime
      })
      .eq('id', job.id)

    console.log(`✅ Completed job ${job.id} in ${processingTime}ms`)

    // Trigger status aggregation
    await supabase.rpc('aggregate_crawl_status', { parent_source_id_param: job.parentSourceId })

  } catch (error) {
    console.error(`❌ Failed job ${job.id}:`, error)
    
    const processingTime = Date.now() - startTime
    
    // Update job as failed
    await supabase
      .from('crawl_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message,
        processing_time_ms: processingTime
      })
      .eq('id', job.id)

    // Trigger status aggregation even on failure
    await supabase.rpc('aggregate_crawl_status', { parent_source_id_param: job.parentSourceId })
  }
}

function cleanHtmlContent(html: string): string {
  // Basic HTML cleaning - remove scripts, styles, nav, footer
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove common boilerplate phrases
  const boilerplatePatterns = [
    /click here/gi,
    /subscribe now/gi,
    /read more/gi,
    /continue reading/gi,
    /advertisement/gi,
    /cookie policy/gi,
    /privacy policy/gi
  ]
  
  boilerplatePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  return cleaned
}

function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  // Simple chunking by sentences with token approximation
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const chunks: string[] = []
  let currentChunk = ''
  let tokenCount = 0

  for (const sentence of sentences) {
    const sentenceTokens = sentence.trim().split(/\s+/).length
    
    if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
      tokenCount = sentenceTokens
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
      tokenCount += sentenceTokens
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // Prune to keep only best 3-5 chunks per page
  const prunedChunks = chunks
    .sort((a, b) => b.length - a.length) // Sort by length (simple quality metric)
    .slice(0, 5) // Keep top 5 chunks
    .filter(chunk => chunk.length > 20) // Filter out very short chunks
  
  return prunedChunks
}

async function processChunksWithDeduplication(
  chunks: string[], 
  sourceId: string, 
  supabase: any
): Promise<{ uniqueChunks: number, duplicateChunks: number, totalCompressedSize: number }> {
  let uniqueChunks = 0
  let duplicateChunks = 0
  let totalCompressedSize = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const contentHash = await generateHash(chunk)
    
    // Check if chunk already exists
    const { data: existingChunk } = await supabase
      .from('semantic_chunks')
      .select('id, ref_count')
      .eq('content_hash', contentHash)
      .single()

    let chunkId: string

    if (existingChunk) {
      // Chunk exists, increment reference count
      chunkId = existingChunk.id
      await supabase
        .from('semantic_chunks')
        .update({ 
          ref_count: existingChunk.ref_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', chunkId)
      
      duplicateChunks++
      console.log(`🔄 Reusing existing chunk ${chunkId}`)
      
    } else {
      // New chunk, compress and store
      const compressedBlob = await compressText(chunk)
      totalCompressedSize += compressedBlob.length
      
      const { data: newChunk, error } = await supabase
        .from('semantic_chunks')
        .insert({
          content_hash: contentHash,
          compressed_blob: compressedBlob,
          token_count: chunk.split(/\s+/).length,
          ref_count: 1
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating chunk:', error)
        continue
      }

      chunkId = newChunk.id
      uniqueChunks++
      console.log(`✨ Created new chunk ${chunkId}`)
    }

    // Create mapping
    await supabase
      .from('source_to_chunk_map')
      .insert({
        source_id: sourceId,
        chunk_id: chunkId,
        chunk_index: i
      })
  }

  return { uniqueChunks, duplicateChunks, totalCompressedSize }
}

async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function compressText(text: string): Promise<Uint8Array> {
  // Simulate high-efficiency compression (in production, use Zstd level -19)
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  
  // For demo, we'll use a compression stream (DeflateStream would be closer to Zstd)
  const compressionStream = new CompressionStream('gzip')
  const writer = compressionStream.writable.getWriter()
  const reader = compressionStream.readable.getReader()
  
  writer.write(data)
  writer.close()
  
  const chunks: Uint8Array[] = []
  let done = false
  
  while (!done) {
    const { value, done: readerDone } = await reader.read()
    done = readerDone
    if (value) {
      chunks.push(value)
    }
  }
  
  // Combine chunks into single array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  return result
}
