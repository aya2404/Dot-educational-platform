const Organization = require('../models/Organization');

// Resolve the caller's tenant. Missing req.tenantId (should not happen behind
// `protect`) falls back to the shared 'default' tenant with a warning.
const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('organizationController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

// Only #rgb / #rrggbb (optionally with alpha) hex colors are accepted for CSS
// custom properties, so a value can never inject arbitrary CSS.
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// A logo URL is only stored if it is an http(s) URL or a local /uploads path —
// never a javascript:/data: scheme that could execute when rendered.
const isSafeLogoUrl = (value) => /^(https?:\/\/|\/)/.test(value);

// Find-or-create this tenant's settings (idempotent; safe under concurrency).
const ensureOrganization = async (tenantId) => {
  const existing = await Organization.findOne({ tenantId });
  if (existing) return existing;
  try {
    return await Organization.create({ tenantId });
  } catch (error) {
    if (error.code === 11000) {
      return Organization.findOne({ tenantId }); // created by a concurrent request
    }
    throw error;
  }
};

// GET /api/organizations/settings — any authenticated user (needed so the theme
// can be applied for every role), always scoped to the caller's tenant.
const getSettings = async (req, res) => {
  try {
    const org = await ensureOrganization(getTenantId(req));
    return res.json({ success: true, data: org });
  } catch (error) {
    console.error('getSettings error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PUT /api/organizations/settings — admin/superadmin only, own tenant only.
const updateSettings = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل إعدادات المنصة' });
    }

    const org = await ensureOrganization(getTenantId(req));
    const { platformName, logoUrl, primaryColor, secondaryColor } = req.body;

    if (typeof platformName === 'string' && platformName.trim()) {
      org.platformName = platformName.trim();
    }
    if (typeof logoUrl === 'string') {
      const clean = logoUrl.trim();
      org.logoUrl = clean === '' || isSafeLogoUrl(clean) ? clean : org.logoUrl;
    }
    if (typeof primaryColor === 'string' && HEX_COLOR.test(primaryColor.trim())) {
      org.primaryColor = primaryColor.trim();
    }
    if (typeof secondaryColor === 'string' && HEX_COLOR.test(secondaryColor.trim())) {
      org.secondaryColor = secondaryColor.trim();
    }

    await org.save();
    return res.json({ success: true, data: org });
  } catch (error) {
    console.error('updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = { getSettings, updateSettings };
