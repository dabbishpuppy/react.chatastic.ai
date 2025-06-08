
import { supabase } from "@/integrations/supabase/client";
import { UserConsent } from "@/types/rag";

export class GDPRService {
  // Record user consent
  static async recordConsent(data: {
    team_id: string;
    consent_type: string;
    consented: boolean;
    ip_address?: string;
    user_agent?: string;
  }): Promise<UserConsent> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const consentData = {
      ...data,
      user_id: user.id,
      consent_date: data.consented ? new Date().toISOString() : undefined,
      withdrawal_date: !data.consented ? new Date().toISOString() : undefined
    };

    const { data: consent, error } = await supabase
      .from('user_consents')
      .insert(consentData)
      .select()
      .single();

    if (error) throw new Error(`Failed to record consent: ${error.message}`);
    return {
      ...consent,
      ip_address: consent.ip_address as string || null
    };
  }

  // Get user consents
  static async getUserConsents(teamId?: string): Promise<UserConsent[]> {
    let query = supabase
      .from('user_consents')
      .select('*')
      .order('created_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: consents, error } = await query;

    if (error) throw new Error(`Failed to fetch consents: ${error.message}`);
    return (consents || []).map(consent => ({
      ...consent,
      ip_address: consent.ip_address as string || null
    }));
  }

  // Withdraw consent
  static async withdrawConsent(consentId: string): Promise<UserConsent> {
    const { data: consent, error } = await supabase
      .from('user_consents')
      .update({
        consented: false,
        withdrawal_date: new Date().toISOString()
      })
      .eq('id', consentId)
      .select()
      .single();

    if (error) throw new Error(`Failed to withdraw consent: ${error.message}`);
    return {
      ...consent,
      ip_address: consent.ip_address as string || null
    };
  }

  // Export user data
  static async exportUserData(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        target_user_id: userId
      });

      if (error) throw new Error(`Failed to export user data: ${error.message}`);
      return data;
    } catch (error) {
      console.warn('Export function not available:', error);
      return null;
    }
  }

  // Delete user data
  static async deleteUserData(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('delete_user_data', {
        target_user_id: userId
      });

      if (error) throw new Error(`Failed to delete user data: ${error.message}`);
      return data || false;
    } catch (error) {
      console.warn('Delete function not available:', error);
      return false;
    }
  }

  // Check if user has given consent for a specific type
  static async hasConsent(teamId: string, consentType: string): Promise<boolean> {
    const { data: consent, error } = await supabase
      .from('user_consents')
      .select('consented')
      .eq('team_id', teamId)
      .eq('consent_type', consentType)
      .eq('consented', true)
      .is('withdrawal_date', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check consent: ${error.message}`);
    }

    return !!consent?.consented;
  }

  // Generate data subject access report - added this method
  static async generateDataSubjectAccessReport(
    teamId: string,
    subjectId: string
  ): Promise<{
    personalData: any[];
    processingActivities: string[];
    retentionPeriods: Record<string, number>;
    thirdPartySharing: string[];
  }> {
    console.log(`📊 Generating data subject access report for ${subjectId}`);

    // Collect all personal data
    const personalData: any[] = [];

    // Get user consents
    const consents = await this.getUserConsents(teamId);
    personalData.push(...consents);

    // Get conversation data (if applicable)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', subjectId);

    if (conversations) {
      personalData.push(...conversations);
    }

    return {
      personalData,
      processingActivities: [
        'Customer support chatbot interactions',
        'Service improvement analytics',
        'Security monitoring'
      ],
      retentionPeriods: {
        'conversations': 365,
        'audit_logs': 2555, // 7 years
        'user_consents': 2555
      },
      thirdPartySharing: [
        'Cloud infrastructure providers (AWS, Google Cloud)',
        'Analytics providers (if configured)'
      ]
    };
  }
}
