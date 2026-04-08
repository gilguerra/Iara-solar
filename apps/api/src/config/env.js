import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),

  postgres: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'iara_solar',
    user: process.env.POSTGRES_USER || 'iara',
    password: process.env.POSTGRES_PASSWORD || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Google Solar API — Building Insights
  // Leave empty to use the Brazil average irradiation fallback.
  googleSolarApiKey: process.env.GOOGLE_SOLAR_API_KEY || '',
};
