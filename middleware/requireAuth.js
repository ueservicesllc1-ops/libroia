const { envBool } = require("../lib/envFlags");
const { getDb } = require("../lib/billing/db");

function isSkipAuth() {
  return envBool("SKIP_AUTH");
}

function isBillingRelaxed() {
  return envBool("BILLING_RELAXED");
}

/**
 * @param {import("express").Request} req
 */
function getUserId(req) {
  if (isSkipAuth()) {
    return Number(process.env.DEV_USER_ID || 1);
  }
  return req.session && req.session.userId;
}

function requireAuth(req, res, next) {
  if (isSkipAuth()) return next();
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Debes iniciar sesión." });
  }
  next();
}

/**
 * Middleware factory que requiere que el usuario tenga un plan específico.
 * Uso: router.post("/ruta", requireAuth, requirePlan("pro"), handler)
 * @param {"pro"|"basic"} plan
 */
function requirePlan(plan) {
  return (req, res, next) => {
    // En modo relaxed o skipAuth no aplicamos restricciones de plan
    if (isBillingRelaxed() || isSkipAuth()) return next();

    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: "No autenticado." });

    const db = getDb();
    const user = db.prepare("SELECT plan, is_admin FROM users WHERE id = ?").get(uid);

    // Admins siempre pasan
    if (user && user.is_admin) return next();

    // Compatibilidad legacy: usuarios antiguos con "basic" equivalen a PRO.
    const PLAN_HIERARCHY = { free: 0, basic: 2, pro: 2 };
    const userLevel = PLAN_HIERARCHY[user?.plan] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[plan] ?? 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Esta función requiere el plan ${plan.toUpperCase()}. Actualiza tu plan para continuar.`,
        reason: "PLAN_REQUIRED",
        required_plan: plan,
      });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (isSkipAuth()) return next();
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: "No autenticado" });

  const db = getDb();
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(uid);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: "Acceso denegado: Se requieren privilegios de administrador" });
  }
  next();
}

function requireSellerApproved(req, res, next) {
  if (isSkipAuth()) return next();
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: "No autenticado" });

  const db = getDb();
  const seller = db.prepare("SELECT status FROM seller_profiles WHERE user_id = ?").get(uid);
  
  if (!seller) {
    return res.status(403).json({ error: "No tienes perfil de vendedor activo. Debes solicitarlo primero." });
  }
  if (seller.status !== 'approved') {
    return res.status(403).json({ error: `Tu perfil de vendedor está: ${seller.status}` });
  }
  next();
}

module.exports = { 
  requireAuth, 
  requirePlan,
  getUserId, 
  isSkipAuth, 
  isBillingRelaxed, 
  requireAdmin, 
  requireSellerApproved 
};
