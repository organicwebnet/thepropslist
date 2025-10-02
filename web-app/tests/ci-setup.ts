import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 CI Environment Setup');
  console.log('Base URL:', config.use?.baseURL);
  console.log('Workers:', config.workers);
  console.log('Retries:', config.retries);
  
  // Wait a bit for the production environment to be ready
  if (config.use?.baseURL?.includes('props-bible-app-1c1cb.web.app')) {
    console.log('⏳ Waiting for production environment to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('✅ CI setup complete');
}

export default globalSetup;
