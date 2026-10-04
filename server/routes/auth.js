const router = require('express').Router()
const bcrypt = require('bcryptjs')
const db = require('../db')

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'E-posta ve şifre gerekli' })

  try {
    const { rows } = await db.query(
      'SELECT id, email, password_hash, full_name, role, is_active FROM profiles WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı' })
    if (!user.is_active) return res.status(403).json({ error: 'Hesabınız devre dışı' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'E-posta veya şifre hatalı' })

    req.session.userId   = user.id
    req.session.userRole = user.role
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Oturum başlatılamadı' })
      res.json({ id: user.id, email: user.email, full_name: user.full_name, role: user.role })
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Çıkış yapılamadı' })
    res.clearCookie('sid')
    res.json({ ok: true })
  })
})

// GET /auth/me
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Oturum yok' })
  try {
    const { rows } = await db.query(
      'SELECT id, email, full_name, role FROM profiles WHERE id = $1 AND is_active = true',
      [req.session.userId]
    )
    if (!rows[0]) return res.status(401).json({ error: 'Kullanıcı bulunamadı' })
    res.json(rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
