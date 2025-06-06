
export function buildErrorResponse(error: any, corsHeaders: Record<string, string>) {
  console.error('❌ Error in enhanced crawl:', error);
  
  // Provide more specific error messages based on error type
  let errorMessage = 'Unknown error occurred';
  let statusCode = 500;
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    if (error.message.includes('authentication') || error.message.includes('No API key')) {
      statusCode = 401;
      errorMessage = 'Authentication failed. Please ensure proper API credentials are configured.';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message.includes('Invalid JSON')) {
      statusCode = 400;
    } else if (error.message.includes('Missing required fields')) {
      statusCode = 400;
    }
  }
  
  return new Response(
    JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      debugInfo: {
        errorType: error.constructor.name,
        originalMessage: error instanceof Error ? error.message : String(error)
      }
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode
    }
  );
}

export function buildSuccessResponse(data: any, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify(data),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    }
  );
}
