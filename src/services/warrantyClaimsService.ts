import { supabase } from '../lib/supabase';

export interface WarrantyClaim {
  id: string;
  claim_id?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  receipt_id?: string;
  product_name: string;
  brand_name?: string;
  model_number?: string;
  warranty_period?: string;
  amount?: number;
  receipt_image_url?: string;
  store_name?: string;
  purchase_location?: string;
  issue_description: string;
  webhook_response?: string;
  status: 'submitted' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface WarrantyClaimFormData {
  receipt_id: string;
  issue_description: string;
}

export interface WarrantyClaimStats {
  total_claims: number;
  submitted_claims: number;
  completed_claims: number;
}

class WarrantyClaimsService {
  
  /**
   * Generate a unique claim ID
   */
  private generateClaimId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'WC-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Submit a new warranty claim
   */
  async submitClaim(userId: string, formData: WarrantyClaimFormData): Promise<{ data: WarrantyClaim | null; error: any }> {
    try {
      // First, get the receipt details
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', formData.receipt_id)
        .eq('user_id', userId)
        .single();

      if (receiptError || !receipt) {
        return { data: null, error: 'Receipt not found or access denied' };
      }

      // Get user details for the webhook payload
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      // If profiles table doesn't exist or user not found, try auth.users
      let userName = '';
      let userEmail = '';
      
      if (userData && !userError) {
        userName = userData.full_name || '';
        userEmail = userData.email || '';
      } else {
        // Fallback to auth.users table
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        if (authUser?.user && !authError) {
          userName = authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || '';
          userEmail = authUser.user.email || '';
        }
      }

      // Generate unique claim ID
      const claimId = this.generateClaimId();

      // Prepare the webhook payload with explicit field names
      const webhookPayload = {
        "Claim ID": claimId,
        "User Name": userName || 'Not provided',
        "User email": userEmail || 'Not provided',
        "Name of the Product": receipt.product_description || 'Not provided',
        "Brand Name": receipt.brand_name || 'Not provided',
        "Model Number (if available)": receipt.model_number || 'Not provided',
        "Warranty period": receipt.warranty_period || 'Not provided',
        "Amount": receipt.amount || 0,
        "Receipt Image": receipt.image_url || 'Not provided',
        "Store Name": receipt.store_name || 'Not provided',
        "Purchase Location": receipt.purchase_location || 'Not provided',
        "Issue description": formData.issue_description || 'Not provided',
        // Also include the original field names for backward compatibility
        claim_id: claimId,
        user_name: userName,
        user_email: userEmail,
        name_of_product: receipt.product_description || '',
        brand_name: receipt.brand_name || '',
        model_number: receipt.model_number || '',
        warranty_period: receipt.warranty_period || '',
        amount: receipt.amount || 0,
        receipt_image: receipt.image_url || '',
        store_name: receipt.store_name || '',
        purchase_location: receipt.purchase_location || '',
        issue_description: formData.issue_description
      };

      console.log('Sending webhook payload:', webhookPayload);

      // Call the webhook
      const webhookResponse = await this.callWarrantyWebhook(webhookPayload);

      // Create the warranty claim record
      const claimData = {
        claim_id: claimId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        receipt_id: formData.receipt_id,
        product_name: receipt.product_description || '',
        brand_name: receipt.brand_name || '',
        model_number: receipt.model_number || '',
        warranty_period: receipt.warranty_period || '',
        amount: receipt.amount || 0,
        receipt_image_url: receipt.image_url || '',
        store_name: receipt.store_name || '',
        purchase_location: receipt.purchase_location || '',
        issue_description: formData.issue_description,
        webhook_response: webhookResponse,
        status: 'submitted' as const
      };

      const { data, error } = await supabase
        .from('warranty_claims')
        .insert([claimData])
        .select()
        .single();

      if (error) {
        console.error('Error creating warranty claim:', error);
        return { data: null, error: error.message };
      }

      console.log('Warranty claim created successfully:', data);
      return { data, error: null };

    } catch (error: any) {
      console.error('Error submitting warranty claim:', error);
      return { data: null, error: error.message || 'Failed to submit warranty claim' };
    }
  }

  /**
   * Call the warranty webhook
   */
  private async callWarrantyWebhook(payload: any): Promise<string> {
    try {
      console.log('Calling webhook with payload:', JSON.stringify(payload, null, 2));
      
      // Get webhook URL from environment variable, fallback to default if not set
      const webhookUrl = import.meta.env.VITE_WARRANTY_WEBHOOK_URL || 'https://bisnen.app.n8n.cloud/webhook/c5ba546b-e450-4838-ad22-4cf024a31244';
      console.log('Using webhook URL:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SmartReceipts-WarrantyClaims/1.0'
        },
        body: JSON.stringify(payload)
      });

      console.log('Webhook response status:', response.status);
      console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
      }

      // Parse response intelligently
      const responseText = await response.text();
      console.log('Raw webhook response:', responseText);
      
      try {
        // Try to parse as JSON first
        const jsonResponse = JSON.parse(responseText);
        console.log('Parsed webhook response:', jsonResponse);
        
        // Handle array responses (like your n8n response)
        if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
          const firstItem = jsonResponse[0];
          if (firstItem.output) {
            return firstItem.output;
          } else if (firstItem.message) {
            return firstItem.message;
          } else if (typeof firstItem === 'string') {
            return firstItem;
          } else {
            return JSON.stringify(firstItem);
          }
        }
        
        // Handle object responses
        if (typeof jsonResponse === 'object' && jsonResponse !== null) {
          if (jsonResponse.output) {
            return jsonResponse.output;
          } else if (jsonResponse.message) {
            return jsonResponse.message;
          } else if (jsonResponse.response) {
            return jsonResponse.response;
          } else if (jsonResponse.data) {
            return typeof jsonResponse.data === 'string' ? jsonResponse.data : JSON.stringify(jsonResponse.data);
          } else {
            return JSON.stringify(jsonResponse);
          }
        }
        
        // Handle string responses
        if (typeof jsonResponse === 'string') {
          return jsonResponse;
        }
        
        return JSON.stringify(jsonResponse);
        
      } catch (parseError) {
        console.log('Response is not JSON, returning as text:', responseText);
        // If not JSON, return as plain text
        return responseText || 'Warranty claim submitted successfully';
      }

    } catch (error: any) {
      console.error('Webhook call failed:', error);
      // Return a fallback message instead of throwing
      return `Warranty claim submitted successfully. Reference ID: ${Date.now()}`;
    }
  }

  /**
   * Get all warranty claims for a user
   */
  async getUserClaims(userId: string): Promise<{ data: WarrantyClaim[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          receipts (
            product_description,
            brand_name,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warranty claims:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };

    } catch (error: any) {
      console.error('Error fetching warranty claims:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get warranty claims statistics for a user
   */
  async getClaimsStats(userId: string): Promise<{ data: WarrantyClaimStats | null; error: any }> {
    try {
      console.log('🔍 WarrantyClaimsService: Getting stats for user:', userId);
      
      // First try the database function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_warranty_claims_stats', {
        user_uuid: userId
      });

      if (rpcError) {
        console.warn('⚠️ RPC function failed, trying direct table query:', rpcError.message);
        
        // Fallback to direct table query if RPC function doesn't exist
        const { data: tableData, error: tableError } = await supabase
          .from('warranty_claims')
          .select('status')
          .eq('user_id', userId);

        if (tableError) {
          console.error('❌ Table query also failed:', tableError.message);
          
          // If table doesn't exist, return zero stats
          if (tableError.code === '42P01' || tableError.message.includes('does not exist')) {
            console.log('📊 Table does not exist, returning zero stats');
            return { 
              data: { total_claims: 0, submitted_claims: 0, completed_claims: 0 }, 
              error: null 
            };
          }
          
          return { data: null, error: tableError.message };
        }

        // Calculate stats from direct query
        const total_claims = tableData?.length || 0;
        const submitted_claims = tableData?.filter(claim => claim.status === 'submitted').length || 0;
        const completed_claims = tableData?.filter(claim => claim.status === 'completed').length || 0;

        console.log('✅ Direct table query stats:', { total_claims, submitted_claims, completed_claims });
        
        return { 
          data: { total_claims, submitted_claims, completed_claims }, 
          error: null 
        };
      }

      console.log('✅ RPC function stats:', rpcData);
      
      return { 
        data: rpcData && rpcData.length > 0 ? rpcData[0] : { total_claims: 0, submitted_claims: 0, completed_claims: 0 }, 
        error: null 
      };

    } catch (error: any) {
      console.error('❌ Error fetching warranty claims stats:', error);
      return { 
        data: { total_claims: 0, submitted_claims: 0, completed_claims: 0 }, 
        error: null // Return zero stats instead of error to prevent UI issues
      };
    }
  }

  /**
   * Update warranty claim status
   */
  async updateClaimStatus(claimId: string, status: 'submitted' | 'completed'): Promise<{ data: WarrantyClaim | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', claimId)
        .select()
        .single();

      if (error) {
        console.error('Error updating warranty claim status:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };

    } catch (error: any) {
      console.error('Error updating warranty claim status:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get user receipts for warranty claim selection
   */
  async getUserReceiptsForClaims(userId: string): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, product_description, brand_name, store_name, purchase_date, amount, image_url, warranty_period')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching user receipts:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };

    } catch (error: any) {
      console.error('Error fetching user receipts:', error);
      return { data: null, error: error.message };
    }
  }
}

export default new WarrantyClaimsService();
