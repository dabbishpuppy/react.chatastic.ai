
export const loadSettingsFromEdgeFunction = async (agentId: string, bustCache = false) => {
  try {
    console.log('📡 Loading settings from edge function for agent:', agentId);
    const timestamp = bustCache ? `&_t=${Date.now()}` : '';
    const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}${timestamp}`, {
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Edge function response not ok:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('📡 Edge function response:', data);
    
    return data;
  } catch (error) {
    console.error('Error loading settings from edge function:', error);
    return null;
  }
};
