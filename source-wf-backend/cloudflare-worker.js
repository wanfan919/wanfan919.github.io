export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    try {
      await ensureMetaTables(env)

      if (request.method === 'POST' && url.pathname === '/chat') {
        return await chat(request, env)
      }

      if (request.method === 'POST' && url.pathname === '/api/register') {
        return await register(request, env)
      }
      if (request.method === 'POST' && url.pathname === '/api/login') {
        return await login(request, env)
      }
      if (request.method === 'GET' && url.pathname === '/api/projects') {
        return await listProjects(env)
      }
      if (request.method === 'POST' && url.pathname === '/api/projects') {
        const user = await requireAuth(request, env)
        return await createProject(request, env, user)
      }
      if (request.method === 'GET' && url.pathname === '/api/messages') {
        return await listMessages(env)
      }
      if (request.method === 'POST' && url.pathname === '/api/messages') {
        const user = await requireAuth(request, env)
        return await createMessage(request, env, user)
      }

      const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/)
      if (request.method === 'GET' && projectMatch) {
        return await getProject(env, Number(projectMatch[1]))
      }
      if (request.method === 'DELETE' && projectMatch) {
        const user = await requireAuth(request, env)
        return await deleteProject(env, Number(projectMatch[1]), user)
      }

      const lockMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/(lock|unlock)$/)
      if (request.method === 'POST' && lockMatch) {
        const user = await requireAuth(request, env)
        const projectId = Number(lockMatch[1])
        const action = lockMatch[2]
        return action === 'lock'
          ? await lockProject(env, projectId, user)
          : await unlockProject(env, projectId, user)
      }

      const segmentMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/segments$/)
      if (request.method === 'POST' && segmentMatch) {
        const user = await requireAuth(request, env)
        return await appendSegment(request, env, Number(segmentMatch[1]), user)
      }

      const completeMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/complete$/)
      if (request.method === 'POST' && completeMatch) {
        const user = await requireAuth(request, env)
        return await completeProject(env, Number(completeMatch[1]), user)
      }

      const messageMatch = url.pathname.match(/^\/api\/messages\/(\d+)$/)
      if (request.method === 'DELETE' && messageMatch) {
        const user = await requireAuth(request, env)
        return await deleteMessage(env, Number(messageMatch[1]), user)
      }

      if (request.method === 'GET' && url.pathname === '/api/notifications') {
        const user = await requireAuth(request, env)
        return await listNotifications(env, user)
      }

      const readNoticeMatch = url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/)
      if (request.method === 'POST' && readNoticeMatch) {
        const user = await requireAuth(request, env)
        return await readNotification(env, Number(readNoticeMatch[1]), user)
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/overview') {
        const user = await requireAdmin(request, env)
        return await adminOverview(env, user)
      }

      if (request.method === 'POST' && url.pathname === '/api/admin/message') {
        const user = await requireAdmin(request, env)
        return await adminSendMessage(request, env, user)
      }

      const adminProjectMatch = url.pathname.match(/^\/api\/admin\/projects\/(\d+)\/(force-delete|force-complete|reopen)$/)
      if (request.method === 'POST' && adminProjectMatch) {
        const user = await requireAdmin(request, env)
        const projectId = Number(adminProjectMatch[1])
        const action = adminProjectMatch[2]

        if (action === 'force-delete') return await adminForceDeleteProject(env, projectId, user)
        if (action === 'force-complete') return await adminForceCompleteProject(env, projectId, user)
        return await adminReopenProject(env, projectId, user)
      }

      return json({ error: 'Not found' }, 404)
    } catch (err) {
      return json({ error: err.message || 'Server error' }, err.status || 500)
    }
  }
}

async function register(request, env) {
  const body = await request.json()
  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  if (!/^[\w\-\u4e00-\u9fa5]{3,20}$/.test(username)) {
    throw httpError('用户名需 3-20 位（中英文、数字、下划线、短横线）', 400)
  }
  if (password.length < 6) {
    throw httpError('密码至少 6 位', 400)
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) throw httpError('用户名已存在', 409)

  const salt = randomBase64Url(16)
  const hash = await hashPassword(password, salt)
  const now = Date.now()

  await env.DB.prepare(
    'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)'
  ).bind(username, hash, salt, now).run()

  return json({ ok: true })
}

async function login(request, env) {
  const body = await request.json()
  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  const user = await env.DB.prepare(
    'SELECT id, username, password_hash, salt FROM users WHERE username = ?'
  ).bind(username).first()

  if (!user) throw httpError('账号或密码错误', 401)

  const hash = await hashPassword(password, user.salt)
  if (hash !== user.password_hash) throw httpError('账号或密码错误', 401)

  const token = await signToken(env.AUTH_SECRET, {
    uid: user.id,
    username: user.username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  })

  return json({ token, username: user.username })
}

async function listProjects(env) {
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.name, p.status, p.created_at,
           u.username AS creator_name
    FROM projects p
    JOIN users u ON u.id = p.creator_user_id
    ORDER BY p.created_at DESC
  `).all()

  return json({ projects: results || [] })
}

async function getProject(env, projectId) {
  const project = await env.DB.prepare(`
    SELECT p.id, p.name, p.status, p.created_at, p.starter_text,
           p.creator_user_id, p.lock_user_id, p.lock_expires_at,
           cu.username AS creator_name,
           lu.username AS lock_owner_name
    FROM projects p
    JOIN users cu ON cu.id = p.creator_user_id
    LEFT JOIN users lu ON lu.id = p.lock_user_id
    WHERE p.id = ?
  `).bind(projectId).first()

  if (!project) throw httpError('项目不存在', 404)

  const now = Date.now()
  if (project.lock_expires_at && project.lock_expires_at <= now) {
    project.lock_user_id = null
    project.lock_owner_name = null
  }

  const { results: segments } = await env.DB.prepare(`
    SELECT s.id, s.content, s.created_at, u.username
    FROM segments s
    JOIN users u ON u.id = s.user_id
    WHERE s.project_id = ?
    ORDER BY s.created_at ASC
  `).bind(projectId).all()

  return json({ project: { ...project, segments: segments || [] } })
}

async function createProject(request, env, user) {
  const body = await request.json()
  const name = String(body.name || '').trim()
  const starterText = String(body.starterText || '').trim()

  if (name.length < 2 || name.length > 60) {
    throw httpError('项目名需 2-60 字符', 400)
  }

  const starter = starterText || await generateStarter(env, name)
  const now = Date.now()

  const created = await env.DB.prepare(
    'INSERT INTO projects (name, creator_user_id, status, starter_text, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id'
  ).bind(name, user.uid, 'open', starter, now).first()

  await env.DB.prepare(
    'INSERT INTO segments (project_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  ).bind(created.id, user.uid, starter, now).run()

  return json({ ok: true, projectId: created.id })
}

async function lockProject(env, projectId, user) {
  const row = await env.DB.prepare(
    'SELECT id, status, lock_user_id, lock_expires_at FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)
  if (row.status === 'completed') throw httpError('项目已完成', 409)

  const now = Date.now()
  const lockUntil = now + 2 * 60 * 1000
  const lockedByOther = row.lock_user_id && row.lock_user_id !== user.uid && row.lock_expires_at > now
  if (lockedByOther) throw httpError('当前有其他用户正在续写', 409)

  await env.DB.prepare(
    'UPDATE projects SET lock_user_id = ?, lock_expires_at = ? WHERE id = ?'
  ).bind(user.uid, lockUntil, projectId).run()

  return json({ ok: true, lockUntil })
}

async function unlockProject(env, projectId, user) {
  await env.DB.prepare(
    'UPDATE projects SET lock_user_id = NULL, lock_expires_at = NULL WHERE id = ? AND lock_user_id = ?'
  ).bind(projectId, user.uid).run()
  return json({ ok: true })
}

async function appendSegment(request, env, projectId, user) {
  const body = await request.json()
  const content = String(body.content || '').trim()
  if (!content) throw httpError('续写内容不能为空', 400)

  const row = await env.DB.prepare(
    'SELECT status, lock_user_id, lock_expires_at FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)
  if (row.status === 'completed') throw httpError('项目已完成', 409)

  const now = Date.now()
  const hasLock = row.lock_user_id === user.uid && row.lock_expires_at > now
  if (!hasLock) throw httpError('请先申请续写权', 409)

  await env.DB.prepare(
    'INSERT INTO segments (project_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  ).bind(projectId, user.uid, content, now).run()

  await env.DB.prepare(
    'UPDATE projects SET lock_user_id = NULL, lock_expires_at = NULL WHERE id = ? AND lock_user_id = ?'
  ).bind(projectId, user.uid).run()

  return json({ ok: true, lockReleased: true })
}

async function completeProject(env, projectId, user) {
  const row = await env.DB.prepare(
    'SELECT creator_user_id, status FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)
  if (row.creator_user_id !== user.uid) throw httpError('仅项目创建者可完成项目', 403)
  if (row.status === 'completed') return json({ ok: true })

  await env.DB.prepare(
    'UPDATE projects SET status = ?, completed_at = ?, lock_user_id = NULL, lock_expires_at = NULL WHERE id = ?'
  ).bind('completed', Date.now(), projectId).run()

  return json({ ok: true })
}

async function listMessages(env) {
  const { results } = await env.DB.prepare(`
    SELECT m.id, m.content, m.created_at, u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC
    LIMIT 200
  `).all()

  return json({ messages: results || [] })
}

async function createMessage(request, env, user) {
  const body = await request.json()
  const content = String(body.content || '').trim()
  if (!content) throw httpError('留言内容不能为空', 400)
  if (content.length > 500) throw httpError('留言最多 500 字', 400)

  const now = Date.now()
  const created = await env.DB.prepare(
    'INSERT INTO messages (user_id, content, created_at) VALUES (?, ?, ?) RETURNING id'
  ).bind(user.uid, content, now).first()

  return json({ ok: true, message: { id: created.id, username: user.username, content, created_at: now } })
}

async function deleteMessage(env, messageId, user) {
  const row = await env.DB.prepare('SELECT user_id FROM messages WHERE id = ?').bind(messageId).first()
  if (!row) throw httpError('留言不存在', 404)
  if (row.user_id !== user.uid) throw httpError('仅留言作者可删除', 403)

  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run()
  return json({ ok: true })
}

async function deleteProject(env, projectId, user) {
  const row = await env.DB.prepare(
    'SELECT creator_user_id FROM projects WHERE id = ?'
  ).bind(projectId).first()

  if (!row) throw httpError('项目不存在', 404)
  if (row.creator_user_id !== user.uid) throw httpError('仅项目创建者可删除项目', 403)

  await env.DB.prepare('DELETE FROM segments WHERE project_id = ?').bind(projectId).run()
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run()

  return json({ ok: true })
}

async function adminOverview(env, adminUser) {
  const { results: users } = await env.DB.prepare(`
    SELECT
      u.id,
      u.username,
      u.created_at,
      (SELECT COUNT(1) FROM projects p WHERE p.creator_user_id = u.id) AS project_count
    FROM users u
    WHERE u.id != ?
    ORDER BY u.created_at DESC
  `).bind(adminUser.uid).all()

  const { results: projects } = await env.DB.prepare(`
    SELECT
      p.id,
      p.name,
      p.status,
      p.created_at,
      p.completed_at,
      p.creator_user_id,
      u.username AS creator_name
    FROM projects p
    JOIN users u ON u.id = p.creator_user_id
    ORDER BY p.created_at DESC
  `).all()

  return json({
    users: users || [],
    projects: projects || []
  })
}

async function adminSendMessage(request, env, adminUser) {
  const body = await request.json()
  const toUserId = Number(body.toUserId || 0)
  const title = String(body.title || '').trim()
  const content = String(body.content || '').trim()

  if (!toUserId) throw httpError('接收用户无效', 400)
  if (!title) throw httpError('消息标题不能为空', 400)
  if (!content) throw httpError('消息内容不能为空', 400)
  if (toUserId === adminUser.uid) throw httpError('不能给自己发送管理员消息', 400)

  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(toUserId).first()
  if (!target) throw httpError('接收用户不存在', 404)

  await insertNotification(env, {
    userId: toUserId,
    fromUserId: adminUser.uid,
    type: 'admin_message',
    title,
    content,
    projectId: null
  })

  return json({ ok: true })
}

async function adminForceDeleteProject(env, projectId, adminUser) {
  const row = await env.DB.prepare(
    'SELECT id, name, creator_user_id FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)

  await env.DB.prepare('DELETE FROM segments WHERE project_id = ?').bind(projectId).run()
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run()

  if (row.creator_user_id !== adminUser.uid) {
    await insertNotification(env, {
      userId: row.creator_user_id,
      fromUserId: adminUser.uid,
      type: 'admin_force_delete',
      title: '管理员已强制删除项目',
      content: `你的项目《${row.name}》已被管理员强制删除。`,
      projectId
    })
  }

  return json({ ok: true })
}

async function adminForceCompleteProject(env, projectId, adminUser) {
  const row = await env.DB.prepare(
    'SELECT id, name, status, creator_user_id FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)

  await env.DB.prepare(
    'UPDATE projects SET status = ?, completed_at = ?, lock_user_id = NULL, lock_expires_at = NULL WHERE id = ?'
  ).bind('completed', Date.now(), projectId).run()

  if (row.creator_user_id !== adminUser.uid) {
    await insertNotification(env, {
      userId: row.creator_user_id,
      fromUserId: adminUser.uid,
      type: 'admin_force_complete',
      title: '管理员已强制完成项目',
      content: `你的项目《${row.name}》已被管理员强制标记为完成。`,
      projectId
    })
  }

  return json({ ok: true, status: 'completed' })
}

async function adminReopenProject(env, projectId, adminUser) {
  const row = await env.DB.prepare(
    'SELECT id, name, status, creator_user_id FROM projects WHERE id = ?'
  ).bind(projectId).first()
  if (!row) throw httpError('项目不存在', 404)

  await env.DB.prepare(
    'UPDATE projects SET status = ?, completed_at = NULL, lock_user_id = NULL, lock_expires_at = NULL WHERE id = ?'
  ).bind('open', projectId).run()

  if (row.creator_user_id !== adminUser.uid) {
    await insertNotification(env, {
      userId: row.creator_user_id,
      fromUserId: adminUser.uid,
      type: 'admin_reopen',
      title: '管理员已重新开放项目',
      content: `你的项目《${row.name}》已被管理员重新开放续写。`,
      projectId
    })
  }

  return json({ ok: true, status: 'open' })
}

async function listNotifications(env, user) {
  const { results } = await env.DB.prepare(`
    SELECT
      n.id,
      n.type,
      n.title,
      n.content,
      n.project_id,
      n.created_at,
      n.read_at,
      n.from_user_id,
      fu.username AS from_username
    FROM notifications n
    LEFT JOIN users fu ON fu.id = n.from_user_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 100
  `).bind(user.uid).all()

  return json({ notifications: results || [] })
}

async function readNotification(env, notificationId, user) {
  await env.DB.prepare(
    'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL'
  ).bind(Date.now(), notificationId, user.uid).run()

  return json({ ok: true })
}

async function generateStarter(env, projectName) {
  const prompt = `请为流浪小说项目《${projectName}》写开头。`
  const txt = await generateText(env, [
    { role: 'system', content: '你是文学写作助手，请用中文写一段富有画面感的小说开头，120-220字。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.9, maxTokens: 380 })

  if (txt) return txt

  const fallback = [
    '傍晚的风吹过废弃站台，广播里反复播着一段失真的旋律。你推开锈蚀的门时，地上那行粉笔字还没被雨冲掉：如果你看到这里，故事已经开始。',
    '海雾在凌晨三点吞没了整座港城，灯塔的光像被剪短的句子，一闪一闪。她把那本无封面的笔记塞进你手里，只说了一句：不要让最后一页空着。',
    '旧城区的钟楼停在了七点十七分，所有人都默认它坏了，只有你知道那是提醒。每当夜色压下来，总会有人在钟声缺席的那一分钟里，听见另一个世界开门。'
  ]
  return fallback[Math.floor(Math.random() * fallback.length)]
}

async function chat(request, env) {
  const body = await request.json()
  const message = String(body.message || '').trim()
  const history = Array.isArray(body.history) ? body.history : []

  if (!message) throw httpError('message is required', 400)

  const sanitizedHistory = history
    .slice(-8)
    .filter(it => it && (it.role === 'user' || it.role === 'assistant') && typeof it.content === 'string')
    .map(it => ({ role: it.role, content: it.content }))

  const reply = await generateText(env, [
    { role: 'system', content: 'You are a concise and helpful website assistant.' },
    ...sanitizedHistory,
    { role: 'user', content: message }
  ], { temperature: 0.7, maxTokens: 600 })

  if (!reply) throw httpError('LLM is not configured or returned empty response', 502)
  return json({ reply })
}

function getLlmConfig(env) {
  const apiKey = env.LLM_API_KEY || env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY || ''
  const model =
    env.LLM_MODEL ||
    env.OPENAI_MODEL ||
    env.DEEPSEEK_MODEL ||
    (env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4.1-mini')
  const baseUrl =
    env.LLM_BASE_URL ||
    env.OPENAI_BASE_URL ||
    (env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1')

  return {
    apiKey,
    model,
    endpoint: `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`
  }
}

async function generateText(env, messages, options = {}) {
  const cfg = getLlmConfig(env)
  if (!cfg.apiKey) return ''

  try {
    const upstream = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 512
      })
    })

    if (!upstream.ok) return ''
    const data = await upstream.json()
    return String(data?.choices?.[0]?.message?.content || '').trim()
  } catch (_) {
    return ''
  }
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw httpError('未登录', 401)
  const payload = await verifyToken(env.AUTH_SECRET, token)
  if (!payload || !payload.uid || payload.exp < Date.now()) throw httpError('登录已过期', 401)
  return payload
}

async function requireAdmin(request, env) {
  const user = await requireAuth(request, env)
  const adminName = env.ADMIN_USERNAME || 'Administrator'
  if (user.username !== adminName) throw httpError('仅管理员可执行此操作', 403)
  return user
}

async function ensureMetaTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      from_user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      project_id INTEGER,
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id)
    )
  `).run()

  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)'
  ).run()
}

async function insertNotification(env, { userId, fromUserId = null, type, title, content, projectId = null }) {
  await env.DB.prepare(`
    INSERT INTO notifications (user_id, from_user_id, type, title, content, project_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, fromUserId, type, title, content, projectId, Date.now()).run()
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: enc.encode(salt),
    iterations: 100000,
    hash: 'SHA-256'
  }, key, 256)
  return base64url(new Uint8Array(bits))
}

async function signToken(secret, payload) {
  const enc = new TextEncoder()
  const body = base64url(enc.encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return `${body}.${base64url(new Uint8Array(sig))}`
}

async function verifyToken(secret, token) {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('HMAC', key, fromBase64url(sig), enc.encode(body))
  if (!ok) return null

  try {
    const txt = new TextDecoder().decode(fromBase64url(body))
    return JSON.parse(txt)
  } catch {
    return null
  }
}

function randomBase64Url(len) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return base64url(arr)
}

function base64url(bytes) {
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  })
}

function httpError(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}
