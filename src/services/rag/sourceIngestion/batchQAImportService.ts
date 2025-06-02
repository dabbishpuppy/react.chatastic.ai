import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface QAPair {
  question: string;
  answer: string;
  title?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ImportJob {
  id: string;
  agentId: string;
  teamId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalPairs: number;
  processedPairs: number;
  failedPairs: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  sourceFile?: string;
}

export class BatchQAImportService {
  // Import Q&A pairs from CSV file
  static async importFromCSV(
    file: File,
    agentId: string,
    mapping: {
      questionColumn: string;
      answerColumn: string;
      titleColumn?: string;
      categoryColumn?: string;
      tagsColumn?: string;
    }
  ): Promise<ImportJob> {
    console.log(`📥 Starting CSV import for agent: ${agentId}`);

    try {
      // Parse CSV content
      const csvContent = await this.readFileAsText(file);
      const qaPairs = await this.parseCSV(csvContent, mapping);

      if (qaPairs.length === 0) {
        throw new Error('No valid Q&A pairs found in CSV file');
      }

      // Get team ID
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Create import job
      const importJob: ImportJob = {
        id: crypto.randomUUID(),
        agentId,
        teamId: agent.team_id,
        status: 'pending',
        totalPairs: qaPairs.length,
        processedPairs: 0,
        failedPairs: 0,
        progress: 0,
        sourceFile: file.name
      };

      // Store job in database
      const { error: jobError } = await supabase
        .from('agent_training_jobs')
        .insert({
          id: importJob.id,
          agent_id: agentId,
          status: 'pending',
          total_sources: qaPairs.length,
          processed_sources: 0
        });

      if (jobError) {
        throw new Error(`Failed to create import job: ${jobError.message}`);
      }

      // Start processing in background
      setTimeout(() => {
        this.processBatchImport(importJob.id, qaPairs);
      }, 100);

      console.log(`✅ CSV import job created: ${importJob.id}`);
      return importJob;

    } catch (error: any) {
      console.error('CSV import failed:', error);
      throw new Error(`CSV import failed: ${error.message}`);
    }
  }

  // Import Q&A pairs from JSON file
  static async importFromJSON(
    file: File,
    agentId: string
  ): Promise<ImportJob> {
    console.log(`📥 Starting JSON import for agent: ${agentId}`);

    try {
      const jsonContent = await this.readFileAsText(file);
      const data = JSON.parse(jsonContent);

      let qaPairs: QAPair[] = [];

      // Handle different JSON structures
      if (Array.isArray(data)) {
        qaPairs = data.filter(item => item.question && item.answer);
      } else if (data.qa_pairs && Array.isArray(data.qa_pairs)) {
        qaPairs = data.qa_pairs.filter((item: any) => item.question && item.answer);
      } else {
        throw new Error('Invalid JSON structure. Expected array of Q&A pairs or object with qa_pairs array.');
      }

      if (qaPairs.length === 0) {
        throw new Error('No valid Q&A pairs found in JSON file');
      }

      // Get team ID
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Create import job
      const importJob: ImportJob = {
        id: crypto.randomUUID(),
        agentId,
        teamId: agent.team_id,
        status: 'pending',
        totalPairs: qaPairs.length,
        processedPairs: 0,
        failedPairs: 0,
        progress: 0,
        sourceFile: file.name
      };

      // Store job in database
      const { error: jobError } = await supabase
        .from('agent_training_jobs')
        .insert({
          id: importJob.id,
          agent_id: agentId,
          status: 'pending',
          total_sources: qaPairs.length,
          processed_sources: 0
        });

      if (jobError) {
        throw new Error(`Failed to create import job: ${jobError.message}`);
      }

      // Start processing in background
      setTimeout(() => {
        this.processBatchImport(importJob.id, qaPairs);
      }, 100);

      console.log(`✅ JSON import job created: ${importJob.id}`);
      return importJob;

    } catch (error: any) {
      console.error('JSON import failed:', error);
      throw new Error(`JSON import failed: ${error.message}`);
    }
  }

  // Process the batch import job
  private static async processBatchImport(
    jobId: string,
    qaPairs: QAPair[]
  ): Promise<void> {
    console.log(`🔄 Processing batch import job: ${jobId}`);

    try {
      // Update job status to in_progress
      await supabase
        .from('agent_training_jobs')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('agent_training_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      let processedPairs = 0;
      let failedPairs = 0;
      const errors: string[] = [];

      // Process Q&A pairs one by one
      for (let i = 0; i < qaPairs.length; i++) {
        const qaPair = qaPairs[i];

        try {
          // Create source for Q&A pair
          const title = qaPair.title || `Q&A #${i + 1}`;
          const contentSize = new TextEncoder().encode(qaPair.answer).length;

          await supabase
            .from('agent_sources')
            .insert({
              agent_id: job.agent_id,
              team_id: job.agent_id, // Use agent_id as fallback since we don't have team_id stored
              source_type: 'qa',
              title,
              content: qaPair.answer, // Store only the answer content
              metadata: {
                question: qaPair.question.replace(/<[^>]*>/g, ''), // Store plain text question in metadata
                answer: qaPair.answer, // Store rich text answer in metadata
                category: qaPair.category,
                tags: qaPair.tags || [],
                qa_type: 'imported',
                file_size: contentSize,
                content_type: 'text/html',
                import_batch: jobId,
                ...qaPair.metadata
              }
            });

          processedPairs++;

        } catch (error: any) {
          console.error(`Error processing Q&A pair ${i + 1}:`, error);
          failedPairs++;
          errors.push(`Pair ${i + 1}: ${error.message}`);
        }

        // Update progress every 10 items
        if ((i + 1) % 10 === 0 || i === qaPairs.length - 1) {
          await supabase
            .from('agent_training_jobs')
            .update({
              processed_sources: processedPairs
            })
            .eq('id', jobId);

          const progress = Math.round(((i + 1) / qaPairs.length) * 100);
          console.log(`Import progress: ${progress}% (${processedPairs}/${qaPairs.length})`);
        }
      }

      // Mark job as completed
      const finalStatus = failedPairs > 0 && processedPairs === 0 ? 'failed' : 'completed';
      
      await supabase
        .from('agent_training_jobs')
        .update({
          status: finalStatus,
          processed_sources: processedPairs,
          completed_at: new Date().toISOString(),
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', jobId);

      console.log(`✅ Batch import completed: ${processedPairs}/${qaPairs.length} pairs processed`);

    } catch (error: any) {
      console.error('Batch import processing failed:', error);
      
      // Mark job as failed
      await supabase
        .from('agent_training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
  }

  // Parse CSV content
  private static async parseCSV(
    csvContent: string,
    mapping: {
      questionColumn: string;
      answerColumn: string;
      titleColumn?: string;
      categoryColumn?: string;
      tagsColumn?: string;
    }
  ): Promise<QAPair[]> {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    const questionIndex = headers.indexOf(mapping.questionColumn);
    const answerIndex = headers.indexOf(mapping.answerColumn);
    const titleIndex = mapping.titleColumn ? headers.indexOf(mapping.titleColumn) : -1;
    const categoryIndex = mapping.categoryColumn ? headers.indexOf(mapping.categoryColumn) : -1;
    const tagsIndex = mapping.tagsColumn ? headers.indexOf(mapping.tagsColumn) : -1;

    if (questionIndex === -1) {
      throw new Error(`Question column '${mapping.questionColumn}' not found in CSV`);
    }
    if (answerIndex === -1) {
      throw new Error(`Answer column '${mapping.answerColumn}' not found in CSV`);
    }

    const qaPairs: QAPair[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseCSVLine(lines[i]);
        
        const question = row[questionIndex]?.trim();
        const answer = row[answerIndex]?.trim();

        if (!question || !answer) {
          console.warn(`Skipping row ${i + 1}: missing question or answer`);
          continue;
        }

        const qaPair: QAPair = {
          question,
          answer,
          title: titleIndex >= 0 ? row[titleIndex]?.trim() : undefined,
          category: categoryIndex >= 0 ? row[categoryIndex]?.trim() : undefined,
          tags: tagsIndex >= 0 ? row[tagsIndex]?.split(',').map(t => t.trim()).filter(t => t) : undefined
        };

        qaPairs.push(qaPair);

      } catch (error) {
        console.warn(`Error parsing row ${i + 1}:`, error);
      }
    }

    return qaPairs;
  }

  // Parse a CSV line (simple parser, handles quoted fields)
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"|"$/g, '').replace(/""/g, '"'));
  }

  // Read file as text
  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Get import job status
  static async getImportJobStatus(jobId: string): Promise<ImportJob | null> {
    const { data: job, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) return null;

    return {
      id: jobId,
      agentId: job.agent_id,
      teamId: job.agent_id, // Fallback
      status: job.status === 'in_progress' ? 'in_progress' : job.status as any,
      totalPairs: job.total_sources || 0,
      processedPairs: job.processed_sources || 0,
      failedPairs: 0, // Would need separate tracking
      progress: job.total_sources ? Math.round((job.processed_sources || 0) / job.total_sources * 100) : 0,
      startedAt: job.started_at || undefined,
      completedAt: job.completed_at || undefined,
      errorMessage: job.error_message || undefined,
      sourceFile: 'imported_file' // Would need separate storage
    };
  }

  // Get all import jobs for an agent
  static async getAgentImportJobs(agentId: string): Promise<ImportJob[]> {
    const { data: jobs, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get import jobs:', error);
      return [];
    }

    return (jobs || []).map(job => ({
      id: job.id,
      agentId: job.agent_id,
      teamId: job.agent_id, // Fallback
      status: job.status === 'in_progress' ? 'in_progress' : job.status as any,
      totalPairs: job.total_sources || 0,
      processedPairs: job.processed_sources || 0,
      failedPairs: 0,
      progress: job.total_sources ? Math.round((job.processed_sources || 0) / job.total_sources * 100) : 0,
      startedAt: job.started_at || undefined,
      completedAt: job.completed_at || undefined,
      errorMessage: job.error_message || undefined,
      sourceFile: 'imported_file'
    }));
  }

  // Export Q&A pairs to JSON
  static async exportQAPairs(
    agentId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    console.log(`📤 Exporting Q&A pairs for agent: ${agentId}`);

    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('title, metadata')
      .eq('agent_id', agentId)
      .eq('source_type', 'qa');

    if (error) {
      throw new Error(`Failed to fetch Q&A pairs: ${error.message}`);
    }

    const qaPairs = (sources || []).map(source => {
      // Handle metadata being Json type
      const metadata = source.metadata;
      let question = '';
      let answer = '';
      let category = '';
      let tags: string[] = [];

      if (metadata && typeof metadata === 'object' && metadata !== null) {
        const meta = metadata as any;
        question = meta.question || '';
        answer = meta.answer || '';
        category = meta.category || '';
        tags = meta.tags || [];
      }

      return {
        title: source.title,
        question,
        answer,
        category,
        tags
      };
    }).filter(pair => pair.question && pair.answer);

    if (format === 'csv') {
      return this.exportToCSV(qaPairs);
    } else {
      return JSON.stringify({ qa_pairs: qaPairs }, null, 2);
    }
  }

  // Convert Q&A pairs to CSV format
  private static exportToCSV(qaPairs: any[]): string {
    if (qaPairs.length === 0) return 'title,question,answer,category,tags\n';

    const headers = ['title', 'question', 'answer', 'category', 'tags'];
    const csvLines = [headers.join(',')];

    qaPairs.forEach(pair => {
      const row = [
        this.escapeCSVField(pair.title || ''),
        this.escapeCSVField(pair.question),
        this.escapeCSVField(pair.answer),
        this.escapeCSVField(pair.category || ''),
        this.escapeCSVField(Array.isArray(pair.tags) ? pair.tags.join(', ') : '')
      ];
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }

  // Escape CSV field if it contains commas or quotes
  private static escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
