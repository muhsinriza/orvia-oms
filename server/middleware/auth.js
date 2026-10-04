function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
  }
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
    }
    if (roles.length > 0 && !roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
