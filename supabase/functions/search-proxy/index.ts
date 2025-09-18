import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  query: string
  userId: string
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

    const { query, userId }: SearchRequest = await req.json()

    // Validate input
    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Query and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user and check credits
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has credits
    if (user.credits <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          credits: user.credits 
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Make request to external prescriber API
    const apiResponse = await fetch(`${Deno.env.get('PRESCRIBER_API_URL')}/prescribers/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('PRESCRIBER_API_KEY')}`
      },
      body: JSON.stringify({ query })
    })

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status}`)
    }

    const searchResults = await apiResponse.json()

    // Deduct credits using the database function
    const { data: remainingCredits, error: creditError } = await supabaseClient.rpc(
      'deduct_credits',
      { 
        user_id: userId,
        credits_to_deduct: 1 
      }
    )

    if (creditError) {
      console.error('Credit deduction error:', creditError)
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the search
    await supabaseClient
      .from('search_logs')
      .insert({
        user_id: userId,
        query,
        results_count: searchResults.results_count || 0,
        credits_used: 1
      })

    // Return results with remaining credits
    return new Response(
      JSON.stringify({
        ...searchResults,
        remainingCredits
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Search proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
