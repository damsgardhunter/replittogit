import type { FileEntry } from "./converter";

export interface DatabaseSchema {
  type: 'drizzle' | 'prisma' | 'sequelize' | 'knex' | 'raw-sql' | 'mongoose' | 'typeorm';
  sourceFile: string;
  rawContent: string;
  tables: TableInfo[];
  migrationSQL: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  constraints: string[];
}

export interface DetectedIntegration {
  name: string;
  category: 'payment' | 'auth' | 'storage' | 'email' | 'ai' | 'database' | 'messaging' | 'analytics' | 'cloud' | 'other';
  icon: string;
  envVars: string[];
  detectedIn: string[];
  setupGuide: SetupStep[];
  cloudOptions: CloudOption[];
}

export interface SetupStep {
  title: string;
  description: string;
  code?: string;
}

export interface CloudOption {
  name: string;
  description: string;
  url: string;
  steps: string[];
}

export interface EnvVariable {
  name: string;
  foundIn: string[];
  description: string;
  isSecret: boolean;
}

export interface AnalysisResult {
  databases: DatabaseSchema[];
  integrations: DetectedIntegration[];
  envVariables: EnvVariable[];
  projectType: string;
  hasDocker: boolean;
}

function getTextContent(file: FileEntry): string {
  if (!file.isText || typeof file.content !== 'string') return '';
  return file.content;
}

const ENV_VAR_DESCRIPTIONS: Record<string, { description: string; isSecret: boolean }> = {
  DATABASE_URL: { description: 'PostgreSQL connection string', isSecret: true },
  PGHOST: { description: 'PostgreSQL host address', isSecret: false },
  PGPORT: { description: 'PostgreSQL port number', isSecret: false },
  PGUSER: { description: 'PostgreSQL username', isSecret: true },
  PGPASSWORD: { description: 'PostgreSQL password', isSecret: true },
  PGDATABASE: { description: 'PostgreSQL database name', isSecret: false },
  MONGODB_URI: { description: 'MongoDB connection string', isSecret: true },
  MONGO_URL: { description: 'MongoDB connection URL', isSecret: true },
  REDIS_URL: { description: 'Redis connection string', isSecret: true },
  STRIPE_SECRET_KEY: { description: 'Stripe API secret key', isSecret: true },
  STRIPE_PUBLISHABLE_KEY: { description: 'Stripe publishable key', isSecret: false },
  STRIPE_WEBHOOK_SECRET: { description: 'Stripe webhook signing secret', isSecret: true },
  OPENAI_API_KEY: { description: 'OpenAI API key', isSecret: true },
  ANTHROPIC_API_KEY: { description: 'Anthropic API key', isSecret: true },
  AWS_ACCESS_KEY_ID: { description: 'AWS access key ID', isSecret: true },
  AWS_SECRET_ACCESS_KEY: { description: 'AWS secret access key', isSecret: true },
  AWS_REGION: { description: 'AWS region', isSecret: false },
  S3_BUCKET: { description: 'S3 bucket name', isSecret: false },
  FIREBASE_API_KEY: { description: 'Firebase API key', isSecret: true },
  FIREBASE_PROJECT_ID: { description: 'Firebase project ID', isSecret: false },
  GOOGLE_CLIENT_ID: { description: 'Google OAuth client ID', isSecret: false },
  GOOGLE_CLIENT_SECRET: { description: 'Google OAuth client secret', isSecret: true },
  GITHUB_CLIENT_ID: { description: 'GitHub OAuth client ID', isSecret: false },
  GITHUB_CLIENT_SECRET: { description: 'GitHub OAuth client secret', isSecret: true },
  SENDGRID_API_KEY: { description: 'SendGrid email API key', isSecret: true },
  TWILIO_ACCOUNT_SID: { description: 'Twilio account SID', isSecret: true },
  TWILIO_AUTH_TOKEN: { description: 'Twilio auth token', isSecret: true },
  JWT_SECRET: { description: 'JWT signing secret', isSecret: true },
  SESSION_SECRET: { description: 'Express session secret', isSecret: true },
  PORT: { description: 'Server port number', isSecret: false },
  NODE_ENV: { description: 'Node.js environment', isSecret: false },
  RESEND_API_KEY: { description: 'Resend email API key', isSecret: true },
  CLERK_SECRET_KEY: { description: 'Clerk auth secret key', isSecret: true },
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: { description: 'Clerk publishable key', isSecret: false },
  SUPABASE_URL: { description: 'Supabase project URL', isSecret: false },
  SUPABASE_KEY: { description: 'Supabase anon/service key', isSecret: true },
  SUPABASE_SERVICE_ROLE_KEY: { description: 'Supabase service role key', isSecret: true },
};

function detectEnvVariables(files: FileEntry[]): EnvVariable[] {
  const envVars = new Map<string, EnvVariable>();

  for (const file of files) {
    const content = getTextContent(file);
    if (!content) continue;

    const envPattern = /(?:process\.env\.(\w+)|import\.meta\.env\.(\w+)|os\.environ(?:\.get)?\[?['"]([\w]+)['"]\]?|getenv\(['"]([\w]+)['"]\))/g;
    const dotenvPattern = /^([A-Z_][A-Z0-9_]*)=/gm;

    const basename = file.path.split('/').pop() || '';
    if (basename === '.env' || basename === '.env.example' || basename === '.env.sample') {
      let match;
      while ((match = dotenvPattern.exec(content)) !== null) {
        const name = match[1];
        if (!envVars.has(name)) {
          const known = ENV_VAR_DESCRIPTIONS[name];
          envVars.set(name, {
            name,
            foundIn: [file.path],
            description: known?.description || 'Environment variable',
            isSecret: known?.isSecret ?? true,
          });
        } else {
          envVars.get(name)!.foundIn.push(file.path);
        }
      }
      continue;
    }

    let match;
    while ((match = envPattern.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3] || match[4];
      if (!name) continue;
      if (['NODE_ENV', 'PORT'].includes(name)) continue;

      if (!envVars.has(name)) {
        const known = ENV_VAR_DESCRIPTIONS[name];
        envVars.set(name, {
          name,
          foundIn: [file.path],
          description: known?.description || 'Environment variable',
          isSecret: known?.isSecret ?? true,
        });
      } else {
        const v = envVars.get(name)!;
        if (!v.foundIn.includes(file.path)) {
          v.foundIn.push(file.path);
        }
      }
    }
  }

  return Array.from(envVars.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parseDrizzleSchema(content: string, filePath: string): DatabaseSchema {
  const tables: TableInfo[] = [];

  const tableRegex = /(?:export\s+const\s+)?(\w+)\s*=\s*pgTable\s*\(\s*['"](\w+)['"]\s*,\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const tableName = tableMatch[2];
    const columnsBlock = tableMatch[3];
    const columns: ColumnInfo[] = [];

    const colRegex = /(\w+)\s*:\s*([\w]+)\s*\(\s*['"](\w+)['"](?:,\s*\{[^}]*\})?\s*\)([^,\n]*(?:\.[^\n,]*)*)/g;
    let colMatch;

    while ((colMatch = colRegex.exec(columnsBlock)) !== null) {
      const colName = colMatch[3];
      const colType = colMatch[2];
      const chainStr = colMatch[4];
      const constraints: string[] = [];

      if (chainStr.includes('.primaryKey()')) constraints.push('PRIMARY KEY');
      if (chainStr.includes('.notNull()')) constraints.push('NOT NULL');
      if (chainStr.includes('.unique()')) constraints.push('UNIQUE');
      if (chainStr.includes('.default(')) {
        const defMatch = chainStr.match(/\.default\(([^)]+)\)/);
        if (defMatch) constraints.push(`DEFAULT ${defMatch[1].replace(/sql`([^`]*)`/, '$1')}`);
      }
      if (chainStr.includes('.references(')) constraints.push('FOREIGN KEY');

      columns.push({ name: colName, type: mapDrizzleType(colType), constraints });
    }

    tables.push({ name: tableName, columns });
  }

  return {
    type: 'drizzle',
    sourceFile: filePath,
    rawContent: content,
    tables,
    migrationSQL: generateMigrationSQL(tables),
  };
}

function mapDrizzleType(drizzleType: string): string {
  const typeMap: Record<string, string> = {
    text: 'TEXT',
    varchar: 'VARCHAR(255)',
    integer: 'INTEGER',
    serial: 'SERIAL',
    bigint: 'BIGINT',
    bigserial: 'BIGSERIAL',
    boolean: 'BOOLEAN',
    timestamp: 'TIMESTAMP',
    date: 'DATE',
    json: 'JSON',
    jsonb: 'JSONB',
    uuid: 'UUID',
    real: 'REAL',
    doublePrecision: 'DOUBLE PRECISION',
    numeric: 'NUMERIC',
    smallint: 'SMALLINT',
    smallserial: 'SMALLSERIAL',
    time: 'TIME',
    interval: 'INTERVAL',
    inet: 'INET',
    cidr: 'CIDR',
    macaddr: 'MACADDR',
    pgEnum: 'TEXT',
  };
  return typeMap[drizzleType] || drizzleType.toUpperCase();
}

function parsePrismaSchema(content: string, filePath: string): DatabaseSchema {
  const tables: TableInfo[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;

  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const tableName = modelMatch[1];
    const body = modelMatch[2];
    const columns: ColumnInfo[] = [];

    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('@@') && !l.startsWith('//'));

    for (const line of lines) {
      const fieldMatch = line.match(/^(\w+)\s+([\w\[\]?]+)\s*(.*)/);
      if (!fieldMatch) continue;

      const colName = fieldMatch[1];
      const prismaType = fieldMatch[2];
      const rest = fieldMatch[3];
      const constraints: string[] = [];

      if (rest.includes('@id')) constraints.push('PRIMARY KEY');
      if (rest.includes('@unique')) constraints.push('UNIQUE');
      if (!prismaType.endsWith('?') && !rest.includes('@default')) constraints.push('NOT NULL');
      if (rest.includes('@default(')) {
        const defMatch = rest.match(/@default\(([^)]+)\)/);
        if (defMatch) constraints.push(`DEFAULT ${defMatch[1]}`);
      }
      if (rest.includes('@relation')) constraints.push('FOREIGN KEY');

      columns.push({ name: colName, type: mapPrismaType(prismaType), constraints });
    }

    tables.push({ name: tableName, columns });
  }

  return {
    type: 'prisma',
    sourceFile: filePath,
    rawContent: content,
    tables,
    migrationSQL: generateMigrationSQL(tables),
  };
}

function mapPrismaType(prismaType: string): string {
  const clean = prismaType.replace('?', '').replace('[]', '');
  const typeMap: Record<string, string> = {
    String: 'TEXT',
    Int: 'INTEGER',
    Float: 'DOUBLE PRECISION',
    Boolean: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Json: 'JSONB',
    BigInt: 'BIGINT',
    Decimal: 'NUMERIC',
    Bytes: 'BYTEA',
  };
  return typeMap[clean] || 'TEXT';
}

function generateMigrationSQL(tables: TableInfo[]): string {
  if (tables.length === 0) return '-- No tables detected';

  const statements: string[] = [];

  for (const table of tables) {
    if (table.columns.length === 0) continue;

    const colDefs = table.columns.map(col => {
      const parts = [`  "${col.name}" ${col.type}`];
      for (const c of col.constraints) {
        if (c === 'FOREIGN KEY') continue;
        parts.push(c);
      }
      return parts.join(' ');
    });

    statements.push(
      `CREATE TABLE IF NOT EXISTS "${table.name}" (\n${colDefs.join(',\n')}\n);`
    );
  }

  return statements.join('\n\n');
}

function detectDatabases(files: FileEntry[]): DatabaseSchema[] {
  const schemas: DatabaseSchema[] = [];

  for (const file of files) {
    const content = getTextContent(file);
    if (!content) continue;

    if (content.includes('pgTable(') || content.includes('mysqlTable(') || content.includes('sqliteTable(')) {
      schemas.push(parseDrizzleSchema(content, file.path));
    }

    if (file.path.endsWith('.prisma') || file.path.includes('schema.prisma')) {
      schemas.push(parsePrismaSchema(content, file.path));
    }

    if (file.path.endsWith('.sql') && content.includes('CREATE TABLE')) {
      schemas.push({
        type: 'raw-sql',
        sourceFile: file.path,
        rawContent: content,
        tables: [],
        migrationSQL: content,
      });
    }
  }

  return schemas;
}

interface IntegrationPattern {
  name: string;
  category: DetectedIntegration['category'];
  icon: string;
  patterns: RegExp[];
  envVars: string[];
  setupGuide: SetupStep[];
  cloudOptions: CloudOption[];
}

const INTEGRATION_PATTERNS: IntegrationPattern[] = [
  {
    name: 'PostgreSQL',
    category: 'database',
    icon: 'database',
    patterns: [/['"]pg['"]/, /postgres/, /pgTable/, /DATABASE_URL.*postgres/],
    envVars: ['DATABASE_URL', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'],
    setupGuide: [
      { title: 'Install pg driver', description: 'Install the PostgreSQL driver for your project', code: 'npm install pg @types/pg' },
      { title: 'Set connection string', description: 'Add your DATABASE_URL to a .env file', code: 'DATABASE_URL=postgresql://user:password@host:5432/dbname' },
      { title: 'Run migrations', description: 'Push your schema to the database', code: 'npx drizzle-kit push' },
    ],
    cloudOptions: [
      {
        name: 'Supabase',
        description: 'Free tier with 500MB storage, built-in auth and real-time',
        url: 'https://supabase.com',
        steps: [
          'Create a free account at supabase.com',
          'Create a new project and choose a region',
          'Go to Settings > Database to find your connection string',
          'Copy the connection string and set it as DATABASE_URL',
          'Run your migrations with: npx drizzle-kit push',
        ],
      },
      {
        name: 'Neon',
        description: 'Serverless PostgreSQL with generous free tier and branching',
        url: 'https://neon.tech',
        steps: [
          'Sign up at neon.tech (free tier available)',
          'Create a new project with your preferred region',
          'Copy the connection string from the dashboard',
          'Set it as DATABASE_URL in your .env file',
          'Run migrations: npx drizzle-kit push',
        ],
      },
      {
        name: 'Railway',
        description: 'Simple deployment platform with managed PostgreSQL',
        url: 'https://railway.app',
        steps: [
          'Create a Railway account at railway.app',
          'Add a PostgreSQL plugin to your project',
          'Copy the DATABASE_URL from the Variables tab',
          'Add it to your .env file or deployment environment',
          'Deploy your app and migrations will run automatically',
        ],
      },
      {
        name: 'Render',
        description: 'Free PostgreSQL databases (expire after 90 days on free tier)',
        url: 'https://render.com',
        steps: [
          'Sign up at render.com',
          'Create a new PostgreSQL database from the dashboard',
          'Copy the External Database URL',
          'Set it as DATABASE_URL in your environment',
          'Run your schema migrations',
        ],
      },
    ],
  },
  {
    name: 'MongoDB',
    category: 'database',
    icon: 'database',
    patterns: [/mongoose/, /mongodb/, /MongoClient/, /MONGODB_URI/, /MONGO_URL/],
    envVars: ['MONGODB_URI', 'MONGO_URL'],
    setupGuide: [
      { title: 'Install MongoDB driver', description: 'Install mongoose or the native MongoDB driver', code: 'npm install mongoose' },
      { title: 'Set connection string', description: 'Add your MongoDB URI to .env', code: 'MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname' },
    ],
    cloudOptions: [
      {
        name: 'MongoDB Atlas',
        description: 'Official managed MongoDB with 512MB free tier',
        url: 'https://www.mongodb.com/atlas',
        steps: [
          'Create a free account at mongodb.com/atlas',
          'Create a new cluster (M0 free tier)',
          'Create a database user and set network access',
          'Click Connect > Drivers to get your connection string',
          'Set it as MONGODB_URI in your .env file',
        ],
      },
    ],
  },
  {
    name: 'Redis',
    category: 'database',
    icon: 'database',
    patterns: [/redis/, /ioredis/, /REDIS_URL/],
    envVars: ['REDIS_URL'],
    setupGuide: [
      { title: 'Install Redis client', description: 'Install the Redis client library', code: 'npm install ioredis' },
      { title: 'Set Redis URL', description: 'Add your Redis connection to .env', code: 'REDIS_URL=redis://default:password@host:6379' },
    ],
    cloudOptions: [
      {
        name: 'Upstash',
        description: 'Serverless Redis with generous free tier and REST API',
        url: 'https://upstash.com',
        steps: [
          'Sign up at upstash.com',
          'Create a new Redis database',
          'Copy the REDIS_URL from the dashboard',
          'Add it to your .env file',
        ],
      },
      {
        name: 'Redis Cloud',
        description: 'Official Redis cloud hosting with 30MB free tier',
        url: 'https://redis.com/try-free/',
        steps: [
          'Create a free account at redis.com',
          'Create a new subscription and database',
          'Copy the connection details from the dashboard',
          'Format as redis://user:pass@host:port and set as REDIS_URL',
        ],
      },
    ],
  },
  {
    name: 'Stripe',
    category: 'payment',
    icon: 'credit-card',
    patterns: [/stripe/, /STRIPE_SECRET_KEY/, /STRIPE_PUBLISHABLE_KEY/],
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
    setupGuide: [
      { title: 'Install Stripe SDK', description: 'Install the Stripe Node.js library', code: 'npm install stripe @stripe/stripe-js' },
      { title: 'Get API keys', description: 'Find your keys at dashboard.stripe.com/apikeys' },
      { title: 'Set environment variables', description: 'Add your Stripe keys to .env', code: 'STRIPE_SECRET_KEY=sk_test_...\nSTRIPE_PUBLISHABLE_KEY=pk_test_...' },
      { title: 'Set up webhooks', description: 'Configure webhook endpoint in Stripe dashboard for production events' },
    ],
    cloudOptions: [],
  },
  {
    name: 'OpenAI',
    category: 'ai',
    icon: 'brain',
    patterns: [/openai/, /OPENAI_API_KEY/, /gpt-4/, /gpt-3\.5/, /ChatCompletion/],
    envVars: ['OPENAI_API_KEY'],
    setupGuide: [
      { title: 'Install OpenAI SDK', description: 'Install the official OpenAI library', code: 'npm install openai' },
      { title: 'Get API key', description: 'Create an API key at platform.openai.com/api-keys' },
      { title: 'Set environment variable', description: 'Add your key to .env', code: 'OPENAI_API_KEY=sk-...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Anthropic (Claude)',
    category: 'ai',
    icon: 'brain',
    patterns: [/anthropic/, /ANTHROPIC_API_KEY/, /claude/],
    envVars: ['ANTHROPIC_API_KEY'],
    setupGuide: [
      { title: 'Install Anthropic SDK', description: 'Install the official SDK', code: 'npm install @anthropic-ai/sdk' },
      { title: 'Get API key', description: 'Create an API key at console.anthropic.com' },
      { title: 'Set environment variable', description: 'Add your key to .env', code: 'ANTHROPIC_API_KEY=sk-ant-...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Firebase',
    category: 'cloud',
    icon: 'flame',
    patterns: [/firebase/, /FIREBASE_API_KEY/, /FIREBASE_PROJECT_ID/, /initializeApp/],
    envVars: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_AUTH_DOMAIN'],
    setupGuide: [
      { title: 'Install Firebase SDK', description: 'Install the Firebase libraries', code: 'npm install firebase firebase-admin' },
      { title: 'Create project', description: 'Set up a project at console.firebase.google.com' },
      { title: 'Download config', description: 'Go to Project Settings > General > Your apps to get the config object' },
      { title: 'Set environment variables', description: 'Add Firebase config values to .env' },
    ],
    cloudOptions: [],
  },
  {
    name: 'AWS S3',
    category: 'storage',
    icon: 'cloud',
    patterns: [/aws-sdk/, /@aws-sdk\/client-s3/, /S3Client/, /AWS_ACCESS_KEY_ID/],
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET'],
    setupGuide: [
      { title: 'Install AWS SDK', description: 'Install the S3 client', code: 'npm install @aws-sdk/client-s3' },
      { title: 'Create IAM credentials', description: 'Create an IAM user with S3 access in the AWS Console' },
      { title: 'Create S3 bucket', description: 'Create a bucket in the AWS S3 console with your desired region' },
      { title: 'Set credentials', description: 'Add AWS credentials to .env', code: 'AWS_ACCESS_KEY_ID=AK...\nAWS_SECRET_ACCESS_KEY=...\nAWS_REGION=us-east-1\nS3_BUCKET=my-bucket' },
    ],
    cloudOptions: [
      {
        name: 'Cloudflare R2',
        description: 'S3-compatible storage with no egress fees',
        url: 'https://developers.cloudflare.com/r2/',
        steps: [
          'Sign up at dash.cloudflare.com',
          'Enable R2 from the sidebar',
          'Create a bucket',
          'Generate an API token with R2 permissions',
          'Use S3-compatible endpoint: https://<account-id>.r2.cloudflarestorage.com',
        ],
      },
    ],
  },
  {
    name: 'SendGrid',
    category: 'email',
    icon: 'mail',
    patterns: [/sendgrid/, /@sendgrid\/mail/, /SENDGRID_API_KEY/],
    envVars: ['SENDGRID_API_KEY'],
    setupGuide: [
      { title: 'Install SendGrid SDK', description: 'Install the SendGrid mail library', code: 'npm install @sendgrid/mail' },
      { title: 'Get API key', description: 'Create an API key at app.sendgrid.com/settings/api_keys' },
      { title: 'Verify sender', description: 'Verify your sending domain or email in SendGrid settings' },
      { title: 'Set environment variable', description: 'Add your key to .env', code: 'SENDGRID_API_KEY=SG...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Resend',
    category: 'email',
    icon: 'mail',
    patterns: [/resend/, /RESEND_API_KEY/],
    envVars: ['RESEND_API_KEY'],
    setupGuide: [
      { title: 'Install Resend SDK', description: 'Install the Resend library', code: 'npm install resend' },
      { title: 'Get API key', description: 'Create an API key at resend.com/api-keys' },
      { title: 'Set environment variable', description: 'Add your key to .env', code: 'RESEND_API_KEY=re_...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Twilio',
    category: 'messaging',
    icon: 'phone',
    patterns: [/twilio/, /TWILIO_ACCOUNT_SID/, /TWILIO_AUTH_TOKEN/],
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    setupGuide: [
      { title: 'Install Twilio SDK', description: 'Install the Twilio library', code: 'npm install twilio' },
      { title: 'Get credentials', description: 'Find your Account SID and Auth Token at console.twilio.com' },
      { title: 'Get phone number', description: 'Buy or configure a phone number in the Twilio console' },
      { title: 'Set environment variables', description: 'Add your credentials to .env', code: 'TWILIO_ACCOUNT_SID=AC...\nTWILIO_AUTH_TOKEN=...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Google OAuth',
    category: 'auth',
    icon: 'shield',
    patterns: [/GOOGLE_CLIENT_ID/, /GOOGLE_CLIENT_SECRET/, /googleapis.*oauth/, /passport-google/],
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    setupGuide: [
      { title: 'Create OAuth app', description: 'Go to console.cloud.google.com > APIs & Services > Credentials' },
      { title: 'Configure consent screen', description: 'Set up the OAuth consent screen with your app details' },
      { title: 'Create credentials', description: 'Create OAuth 2.0 Client ID and add your redirect URIs' },
      { title: 'Set environment variables', description: 'Add client ID and secret to .env', code: 'GOOGLE_CLIENT_ID=...\nGOOGLE_CLIENT_SECRET=...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'GitHub OAuth',
    category: 'auth',
    icon: 'shield',
    patterns: [/GITHUB_CLIENT_ID/, /GITHUB_CLIENT_SECRET/, /passport-github/],
    envVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    setupGuide: [
      { title: 'Create OAuth App', description: 'Go to github.com/settings/developers > OAuth Apps > New OAuth App' },
      { title: 'Set callback URL', description: 'Set the Authorization callback URL to your app\'s callback endpoint' },
      { title: 'Set environment variables', description: 'Add client ID and secret to .env', code: 'GITHUB_CLIENT_ID=...\nGITHUB_CLIENT_SECRET=...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Clerk Auth',
    category: 'auth',
    icon: 'shield',
    patterns: [/clerk/, /CLERK_SECRET_KEY/, /@clerk\/nextjs/, /@clerk\/express/],
    envVars: ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'],
    setupGuide: [
      { title: 'Create Clerk app', description: 'Sign up at clerk.com and create a new application' },
      { title: 'Get API keys', description: 'Find your keys in the Clerk Dashboard > API Keys' },
      { title: 'Set environment variables', description: 'Add keys to .env', code: 'CLERK_SECRET_KEY=sk_test_...\nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'Supabase',
    category: 'cloud',
    icon: 'database',
    patterns: [/supabase/, /SUPABASE_URL/, /SUPABASE_KEY/, /@supabase\/supabase-js/],
    envVars: ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    setupGuide: [
      { title: 'Create project', description: 'Sign up at supabase.com and create a new project' },
      { title: 'Get credentials', description: 'Go to Settings > API to find your URL and keys' },
      { title: 'Install SDK', description: 'Install the Supabase client', code: 'npm install @supabase/supabase-js' },
      { title: 'Set environment variables', description: 'Add your Supabase config to .env', code: 'SUPABASE_URL=https://xxx.supabase.co\nSUPABASE_KEY=eyJ...' },
    ],
    cloudOptions: [],
  },
  {
    name: 'WebSocket',
    category: 'other',
    icon: 'radio',
    patterns: [/new WebSocket/, /socket\.io/, /['"]ws['"]/, /WebSocketServer/],
    envVars: [],
    setupGuide: [
      { title: 'Note on WebSockets', description: 'WebSocket connections may need special configuration on cloud platforms' },
      { title: 'Cloud hosting', description: 'Ensure your hosting provider supports WebSocket connections (most do)' },
      { title: 'CORS settings', description: 'Configure allowed origins for WebSocket connections in production' },
    ],
    cloudOptions: [],
  },
];

function detectIntegrations(files: FileEntry[]): DetectedIntegration[] {
  const detected = new Map<string, DetectedIntegration>();

  for (const file of files) {
    const content = getTextContent(file);
    if (!content) continue;

    for (const pattern of INTEGRATION_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(content)) {
          if (!detected.has(pattern.name)) {
            detected.set(pattern.name, {
              name: pattern.name,
              category: pattern.category,
              icon: pattern.icon,
              envVars: pattern.envVars,
              detectedIn: [file.path],
              setupGuide: pattern.setupGuide,
              cloudOptions: pattern.cloudOptions,
            });
          } else {
            const existing = detected.get(pattern.name)!;
            if (!existing.detectedIn.includes(file.path)) {
              existing.detectedIn.push(file.path);
            }
          }
          break;
        }
      }
    }
  }

  return Array.from(detected.values()).sort((a, b) => {
    const order: Record<string, number> = { database: 0, auth: 1, payment: 2, ai: 3, storage: 4, email: 5, messaging: 6, cloud: 7, analytics: 8, other: 9 };
    return (order[a.category] ?? 10) - (order[b.category] ?? 10);
  });
}

export function analyzeProject(files: FileEntry[]): AnalysisResult {
  const textFiles = files.filter(f => f.isText);
  const hasPackageJson = files.some(f => f.path.endsWith('package.json'));
  const hasPyFiles = files.some(f => f.path.endsWith('.py'));
  const hasDocker = files.some(f => {
    const name = f.path.split('/').pop() || '';
    return name === 'Dockerfile' || name === 'docker-compose.yml' || name === 'docker-compose.yaml';
  });

  let projectType = 'generic';
  if (hasPackageJson) projectType = 'node';
  else if (hasPyFiles) projectType = 'python';

  return {
    databases: detectDatabases(textFiles),
    integrations: detectIntegrations(textFiles),
    envVariables: detectEnvVariables(textFiles),
    projectType,
    hasDocker,
  };
}
