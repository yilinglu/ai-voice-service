declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GOOGLE_GENERATIVE_AI_API_KEY: string;
      LAYERCODE_WEBHOOK_SECRET: string;
      LAYERCODE_API_KEY: string;
      NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: string;
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
    }
  }
}

export {}; 