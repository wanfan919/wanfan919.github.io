export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404)
    }

    try {
      const body = await request.json()
      const message = (body.message || '').trim()
      const history = Array.isArray(body.history) ? body.history : []

      if (!message) {
        return json({ error: 'message is required' }, 400)
      }

      const messages = [
        {
          role: 'system',
          content: 'You are a concise and helpful website assistant.'
        },
        ...history.slice(-8),
        { role: 'user', content: message }
      ]

      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4.1-mini',
          messages,
          temperature: 0.7
        })
      })

      if (!upstream.ok) {
        const text = await upstream.text()
        return json({ error: `upstream error: ${text}` }, 502)
      }

      const data = await upstream.json()
      const reply = data?.choices?.[0]?.message?.content || ''
      return json({ reply })
    } catch (err) {
      return json({ error: err.message || 'internal error' }, 500)
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  })
}
