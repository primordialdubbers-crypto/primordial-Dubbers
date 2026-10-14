import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { ensureAdminUser } from './services/adminInit.service.js';

async function bootstrap() {
  try {
    await connectDB();
    console.log('Connected to MongoDB database.');

    await ensureAdminUser();

    const app = createApp();
    app.listen(config.port, () => {
      console.log(`PDI Voice Artist Ranking API server running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
