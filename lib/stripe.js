let _stripe = null;

function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("ADVERTENCIA: STRIPE_SECRET_KEY no está configurada. Las rutas de Stripe no funcionarán.");
    return null;
  }
  _stripe = require("stripe")(key);
  return _stripe;
}

// Compatibilidad: exportar proxy que se inicializa al primer uso
const stripeProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const s = getStripe();
      if (!s) {
        throw new Error(
          `Stripe no está configurado. Asegúrate de que STRIPE_SECRET_KEY esté en las variables de entorno del servidor.`
        );
      }
      const val = s[prop];
      return typeof val === "function" ? val.bind(s) : val;
    },
  }
);

module.exports = stripeProxy;
