import { existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';

for (const envPath of [
  join(process.cwd(), '.env'),
  join(process.cwd(), '../../.env'),
  join(__dirname, '../../../.env'),
]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const DEV_SECRETS = [
  'dev_access_secret_change_in_production',
  'dev_refresh_secret_change_in_production',
  'change_me_access_secret_64chars',
  'change_me_refresh_secret_64chars',
];

function validateProductionSecrets(logger: Logger) {
  if (process.env.NODE_ENV !== 'production') return;

  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  if (!accessSecret || DEV_SECRETS.includes(accessSecret)) {
    logger.warn('⚠️  JWT_ACCESS_SECRET is using a dev/placeholder value in production. Set a secure secret in Render environment variables.');
  }
  if (!refreshSecret || DEV_SECRETS.includes(refreshSecret)) {
    logger.warn('⚠️  JWT_REFRESH_SECRET is using a dev/placeholder value in production. Set a secure secret in Render environment variables.');
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateProductionSecrets(logger);

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cookieParser());
  app.use(compression());

  const productionOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.MOBILE_URL,
  ].filter(Boolean) as string[];

  const allowedOrigins = [
    ...productionOrigins,
    // Vercel deployments
    'https://v19plus-web.vercel.app',
    // Allow any vercel.app preview deployments
    /\.vercel\.app$/,
    // Allow Firebase App Hosting deployments
    /\.hosted\.app$/,
    // Allow any onrender.com (admin panel may be hosted here)
    /\.onrender\.com$/,
    // Local dev
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://localhost',
    'https://localhost',
    // Capacitor native app (Android/iOS WebView)
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost:8080',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) and Capacitor native apps
      if (!origin) return callback(null, true);

      const allowed = allowedOrigins.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin)
      );

      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Profile-ID'],
  });

  // Serve the local uploads folder statically for video/manifest direct playback
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`V19Plus NestJS API running on port ${port}`);
}

bootstrap();
