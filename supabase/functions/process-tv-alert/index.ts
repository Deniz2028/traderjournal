import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        // 1. Parse keys
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 2. Parse Body (expecting JSON from TradingView)
        const payload = await req.json()
        const { pair, message, strategy } = payload

        if (!pair || !message) {
            return new Response(JSON.stringify({ error: 'Missing pair or message' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            })
        }

        // 3. Insert into Database
        const { error } = await supabase
            .from('trading_signals')
            .insert({
                pair,
                message,
                strategy: strategy || 'Unknown'
            })

        if (error) {
            console.error("Db Insert Error:", error)
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            })
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
})
