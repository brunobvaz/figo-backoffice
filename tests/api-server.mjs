// Test fixture only: a fresh, disposable MongoDB process. Never reads the app DB.
import { createRequire } from 'node:module';
const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoMemoryServer } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const argon2 = requireBackend('argon2');
await import('../../backend/tests/setupEnv.js');
const backofficePort = Number(process.env.E2E_PORT || 5174);
process.env.BACKOFFICE_ORIGIN = `http://localhost:${backofficePort},http://127.0.0.1:${backofficePort}`;
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
const { app } = await import('../../backend/src/app.js');
const { Admin } = await import('../../backend/src/models/Admin.js');
const { User } = await import('../../backend/src/models/User.js');
const { Product } = await import('../../backend/src/models/Product.js');
const { Transaction } = await import('../../backend/src/models/Transaction.js');
await Promise.all([Admin.init(), User.init(), Product.init(), Transaction.init()]);
const passwordHash = await argon2.hash('Figo-test-only-2026');
await Admin.create({ name: 'Admin de teste', email: 'admin@figo.test', passwordHash });
const day = (offset) => {
  const d = new Date();
  d.setUTCHours(10, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
};
const people = [
  'Tiago Silva',
  'Ana Ferreira',
  'João Mendes',
  'Carla Lopes',
  'Ricardo Pereira',
  'Marta Ferreira',
  'Ana Silva',
  'Bruno Vaz',
];
const users = await User.insertMany(
  Array.from({ length: 48 }, (_, index) => ({
    name: people[index % people.length],
    email: `pessoa${index}@figo.test`,
    passwordHash,
    termsAcceptedAt: day(index % 45),
    emailVerified: true,
    createdAt: day(index % 45),
    usageIntent: ['buy', 'sell', 'both'][index % 3],
    status: index === 4 ? 'suspended' : 'active',
    location: { city: ['Porto', 'Braga', 'Lisboa'][index % 3] },
  }))
);
const entries = [
  ['Figos da quinta', 'Frutas', 3.5],
  ['Tomate coração-de-boi', 'Legumes', 2.8],
  ['Mel de rosmaninho', 'Mel', 8],
  ['Ovos caseiros', 'Ovos', 3],
  ['Couve galega', 'Legumes', 1.6],
  ['Pêra rocha', 'Frutas', 2.4],
  ['Queijo fresco', 'Laticínios', 4.5],
  ['Pão de centeio', 'Padaria', 3.5],
  ['Compota de figo', 'Conservas', 5],
  ['Sumo de maçã', 'Bebidas', 3],
];
const products = await Product.insertMany(
  Array.from({ length: 126 }, (_, index) => {
    const item = entries[index % entries.length];
    const owner = users[index % users.length];
    return {
      title: item[0],
      description: 'Produto local da nossa quinta. Dados fictícios para testes do backoffice.',
      category: item[1],
      price: item[2],
      unit: '€/kg',
      seller: owner._id,
      location: owner.location.city,
      status: index % 17 === 0 ? 'sold' : 'active',
      is_active: index % 13 !== 0,
      createdAt: day(index % 44),
    };
  })
);
await Transaction.insertMany(
  Array.from({ length: 53 }, (_, index) => {
    const product = products[index];
    const quantity = 1 + (index % 4);
    const status = ['completed', 'pending', 'accepted', 'reviewed'][index % 4];
    return {
      product: product._id,
      productTitle: product.title,
      conversation: new mongoose.Types.ObjectId(),
      clientId: `fixture-${index}`,
      buyer: users[(index + 1) % users.length]._id,
      seller: product.seller,
      unit: product.unit,
      quantity,
      unitPriceSnapshot: product.price,
      totalPriceSnapshot: product.price * quantity,
      status,
      createdAt: day(index % 36),
      ...(['completed', 'reviewed'].includes(status) ? { completedAt: day(index % 30) } : {}),
    };
  })
);
const server = app.listen(3101, '127.0.0.1', () =>
  console.info('Test API ready (disposable database).')
);
async function close() {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGTERM', close);
process.on('SIGINT', close);
