
import { SourcePageRecord } from './types.ts';

export function validateSourcePageRecord(record: any): string[] {
  const errors: string[] = [];
  
  // Required UUID fields - must be strings in valid UUID format
  if (!record.parent_source_id || typeof record.parent_source_id !== 'string') {
    errors.push(`parent_source_id must be a non-empty string (UUID), got ${typeof record.parent_source_id}: ${record.parent_source_id}`);
  } else if (!isValidUUID(record.parent_source_id)) {
    errors.push(`parent_source_id must be a valid UUID format, got: ${record.parent_source_id}`);
  }
  
  if (!record.customer_id || typeof record.customer_id !== 'string') {
    errors.push(`customer_id must be a non-empty string (UUID), got ${typeof record.customer_id}: ${record.customer_id}`);
  } else if (!isValidUUID(record.customer_id)) {
    errors.push(`customer_id must be a valid UUID format, got: ${record.customer_id}`);
  }
  
  // URL field - must be a non-empty string
  if (!record.url || typeof record.url !== 'string') {
    errors.push(`url must be a non-empty string, got ${typeof record.url}: ${record.url}`);
  }
  
  // Text fields that must be strings (NEVER booleans or other types)
  if (record.status !== undefined) {
    if (typeof record.status !== 'string') {
      errors.push(`status must be a string, got ${typeof record.status} with value: ${record.status}`);
    }
    // Additional validation for allowed status values
    const allowedStatuses = ['pending', 'in_progress', 'completed', 'failed'];
    if (typeof record.status === 'string' && !allowedStatuses.includes(record.status)) {
      errors.push(`status must be one of: ${allowedStatuses.join(', ')}, got: ${record.status}`);
    }
  }
  
  if (record.priority !== undefined) {
    if (typeof record.priority !== 'string') {
      errors.push(`priority must be a string, got ${typeof record.priority} with value: ${record.priority}`);
    }
    // Additional validation for allowed priority values
    const allowedPriorities = ['normal', 'high', 'slow'];
    if (typeof record.priority === 'string' && !allowedPriorities.includes(record.priority)) {
      errors.push(`priority must be one of: ${allowedPriorities.join(', ')}, got: ${record.priority}`);
    }
  }
  
  if (record.error_message !== undefined && record.error_message !== null && typeof record.error_message !== 'string') {
    errors.push(`error_message must be a string or null, got ${typeof record.error_message}: ${record.error_message}`);
  }
  
  if (record.content_hash !== undefined && record.content_hash !== null && typeof record.content_hash !== 'string') {
    errors.push(`content_hash must be a string or null, got ${typeof record.content_hash}: ${record.content_hash}`);
  }
  
  // Integer fields with strict validation - must be actual numbers, not strings
  if (record.retry_count !== undefined) {
    if (typeof record.retry_count !== 'number' || !Number.isInteger(record.retry_count) || record.retry_count < 0) {
      errors.push(`retry_count must be a non-negative integer, got ${typeof record.retry_count}: ${record.retry_count}`);
    }
  }
  
  if (record.max_retries !== undefined) {
    if (typeof record.max_retries !== 'number' || !Number.isInteger(record.max_retries) || record.max_retries < 0) {
      errors.push(`max_retries must be a non-negative integer, got ${typeof record.max_retries}: ${record.max_retries}`);
    }
  }
  
  if (record.content_size !== undefined && record.content_size !== null) {
    if (typeof record.content_size !== 'number' || !Number.isInteger(record.content_size) || record.content_size < 0) {
      errors.push(`content_size must be a non-negative integer or null, got ${typeof record.content_size}: ${record.content_size}`);
    }
  }
  
  if (record.chunks_created !== undefined && record.chunks_created !== null) {
    if (typeof record.chunks_created !== 'number' || !Number.isInteger(record.chunks_created) || record.chunks_created < 0) {
      errors.push(`chunks_created must be a non-negative integer or null, got ${typeof record.chunks_created}: ${record.chunks_created}`);
    }
  }
  
  if (record.duplicates_found !== undefined && record.duplicates_found !== null) {
    if (typeof record.duplicates_found !== 'number' || !Number.isInteger(record.duplicates_found) || record.duplicates_found < 0) {
      errors.push(`duplicates_found must be a non-negative integer or null, got ${typeof record.duplicates_found}: ${record.duplicates_found}`);
    }
  }
  
  if (record.processing_time_ms !== undefined && record.processing_time_ms !== null) {
    if (typeof record.processing_time_ms !== 'number' || !Number.isInteger(record.processing_time_ms) || record.processing_time_ms < 0) {
      errors.push(`processing_time_ms must be a non-negative integer or null, got ${typeof record.processing_time_ms}: ${record.processing_time_ms}`);
    }
  }
  
  // Real/float fields - must be numbers, not strings
  if (record.compression_ratio !== undefined && record.compression_ratio !== null) {
    if (typeof record.compression_ratio !== 'number' || record.compression_ratio < 0) {
      errors.push(`compression_ratio must be a non-negative number or null, got ${typeof record.compression_ratio}: ${record.compression_ratio}`);
    }
  }
  
  // Timestamp fields - allow ISO strings or Date objects, but validate format
  if (record.created_at !== undefined) {
    if (typeof record.created_at === 'string') {
      if (isNaN(Date.parse(record.created_at))) {
        errors.push(`created_at must be a valid ISO date string, got: ${record.created_at}`);
      }
    } else if (!(record.created_at instanceof Date)) {
      errors.push(`created_at must be a Date object or ISO string, got ${typeof record.created_at}: ${record.created_at}`);
    }
  }
  
  if (record.updated_at !== undefined && record.updated_at !== null) {
    if (typeof record.updated_at === 'string') {
      if (isNaN(Date.parse(record.updated_at))) {
        errors.push(`updated_at must be a valid ISO date string or null, got: ${record.updated_at}`);
      }
    } else if (!(record.updated_at instanceof Date)) {
      errors.push(`updated_at must be a Date object, ISO string, or null, got ${typeof record.updated_at}: ${record.updated_at}`);
    }
  }
  
  if (record.started_at !== undefined && record.started_at !== null) {
    if (typeof record.started_at === 'string') {
      if (isNaN(Date.parse(record.started_at))) {
        errors.push(`started_at must be a valid ISO date string or null, got: ${record.started_at}`);
      }
    } else if (!(record.started_at instanceof Date)) {
      errors.push(`started_at must be a Date object, ISO string, or null, got ${typeof record.started_at}: ${record.started_at}`);
    }
  }
  
  if (record.completed_at !== undefined && record.completed_at !== null) {
    if (typeof record.completed_at === 'string') {
      if (isNaN(Date.parse(record.completed_at))) {
        errors.push(`completed_at must be a valid ISO date string or null, got: ${record.completed_at}`);
      }
    } else if (!(record.completed_at instanceof Date)) {
      errors.push(`completed_at must be a Date object, ISO string, or null, got ${typeof record.completed_at}: ${record.completed_at}`);
    }
  }

  // Critical check: Ensure no boolean values are being passed to text fields
  const textFields = ['status', 'priority', 'error_message', 'content_hash', 'url'];
  textFields.forEach(field => {
    if (record[field] !== undefined && record[field] !== null && typeof record[field] === 'boolean') {
      errors.push(`CRITICAL TYPE ERROR: ${field} is a boolean (${record[field]}) but database expects text/string`);
    }
  });
  
  // Additional check: Ensure no string values are being passed to numeric fields
  const numericFields = ['retry_count', 'max_retries', 'content_size', 'chunks_created', 'duplicates_found', 'processing_time_ms', 'compression_ratio'];
  numericFields.forEach(field => {
    if (record[field] !== undefined && record[field] !== null && typeof record[field] === 'string') {
      // Allow numeric strings that can be parsed
      const parsed = Number(record[field]);
      if (isNaN(parsed)) {
        errors.push(`CRITICAL TYPE ERROR: ${field} is a non-numeric string (${record[field]}) but database expects number`);
      }
    }
  });
  
  return errors;
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
