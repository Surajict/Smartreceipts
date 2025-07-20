import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, title, body, icon, badge, data }: PushNotificationRequest = await req.json()

    // Get user's push subscription
    const { data: subscriptionData, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (subError || !subscriptionData) {
      console.log(`No push subscription found for user ${userId}`)
      return new Response(
        JSON.stringify({ success: false, error: 'No push subscription found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscription = subscriptionData.subscription

    // Prepare the notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/Smart Receipt Logo.png',
      badge: badge || '/Smart Receipt Logo.png',
      data: {
        url: '/', // URL to open when notification is clicked
        ...data
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })

    // VAPID keys (you need to generate these)
    const vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    }

    // Send push notification using Web Push protocol
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: subscription.keys?.p256dh, // This is simplified - you'd use proper Web Push library
        notification: {
          title,
          body,
          icon: icon || '/Smart Receipt Logo.png',
          click_action: data?.url || '/'
        },
        data
      })
    })

    if (!response.ok) {
      throw new Error(`Push notification failed: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 