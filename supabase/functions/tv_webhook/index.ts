// Follow this setup guide: https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // TradingView sends POST requests with text/plain usually, but we can try to parse JSON
        // Make sure your TradingView alert message is valid JSON like:
        // { "title": "BTC Breakout", "message": "Price crossed 50k", "type": "alert" }

        const payload = await req.json()

        const { title, message, type = 'info', data } = payload

        if (!title) {
            throw new Error("Missing 'title' in payload")
        }

        const { error } = await supabaseClient
            .from('notifications')
            .insert({
                title,
                message,
                type,
                payload: data,
                is_read: false
            })

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
