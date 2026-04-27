require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setup() {
  try {
    console.log('Usando clave:', process.env.STRIPE_SECRET_KEY?.slice(0,20) + '...');

    // 1. Crear o buscar producto PRO
    const products = await stripe.products.list({ limit: 10, active: true });
    let product = products.data.find(p => p.name === 'LibroAI PRO');

    if (!product) {
      product = await stripe.products.create({
        name: 'LibroAI PRO',
        description: 'Proyectos ilimitados · 3M tokens/mes · Publicar · PDF · Portadas · Revisión IA',
        metadata: { app: 'libroai', plan: 'pro' },
      });
      console.log('✅ Producto creado:', product.id);
    } else {
      console.log('✅ Producto existente:', product.id);
    }

    // 2. Crear o buscar precio recurrente $9.99/mes
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(p => p.unit_amount === 999 && p.recurring?.interval === 'month');

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 999,
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'LibroAI PRO Mensual',
      });
      console.log('✅ Precio creado:', price.id);
    } else {
      console.log('✅ Precio existente:', price.id);
    }

    console.log('\n=== PRICE_ID PARA .env ===');
    console.log('STRIPE_PRO_PRICE_ID=' + price.id);
    console.log('========================\n');

    // 3. Obtener publishable key desde la cuenta
    const account = await stripe.account.retrieve();
    console.log('Cuenta:', account.email, '| País:', account.country);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

setup();
