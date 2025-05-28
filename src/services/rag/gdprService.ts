
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
    const { data: consent, error } = await supabase
      .from('user_consents')
      .insert({
        ...data,
        consent_date: data.consented ? new Date().toISOString() : undefined,
        withdrawal_date: !data.consented ? new Date().toISOString() : undefined
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record consent: ${error.message}`);
    return consent;
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
    return consents || [];
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
    return consent;
  }

  // Export user data (uses database function)
  static async exportUserData(userId: string): Promise<any> {
    const { data, error } = await supabase.rpc('export_user_data', {
      target_user_id: userId
    });

    if (error) throw new Error(`Failed to export user data: ${error.message}`);
    return data;
  }

  // Delete user data (uses database function)
  static async deleteUserData(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('delete_user_data', {
      target_user_id: userId
    });

    if (error) throw new Error(`Failed to delete user data: ${error.message}`);
    return data || false;
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
}
