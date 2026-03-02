import { useState } from "react";
import { saveAs } from "file-saver";
import {
  Database,
  CreditCard,
  Shield,
  Cloud,
  Brain,
  Mail,
  Phone,
  Radio,
  BarChart3,
  Flame,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  Check,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  FileCode,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnalysisResult, DatabaseSchema, DetectedIntegration, CloudOption, SetupStep } from "@/lib/analyzer";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  projectName: string;
}

const CATEGORY_ICONS: Record<string, typeof Database> = {
  database: Database,
  payment: CreditCard,
  auth: Shield,
  storage: Cloud,
  ai: Brain,
  email: Mail,
  messaging: Phone,
  analytics: BarChart3,
  cloud: Flame,
  other: Radio,
};

const CATEGORY_COLORS: Record<string, string> = {
  database: 'text-blue-500',
  payment: 'text-green-500',
  auth: 'text-orange-500',
  storage: 'text-purple-500',
  ai: 'text-pink-500',
  email: 'text-cyan-500',
  messaging: 'text-yellow-500',
  analytics: 'text-indigo-500',
  cloud: 'text-red-500',
  other: 'text-muted-foreground',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      data-testid="button-copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, language = '' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-md p-3 text-xs font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <div className="absolute top-1.5 right-1.5">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function SetupStepCard({ step, index }: { step: SetupStep; index: number }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
        {index + 1}
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        <p className="text-sm font-medium">{step.title}</p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {step.code && <CodeBlock code={step.code} />}
      </div>
    </div>
  );
}

function CloudOptionCard({ option }: { option: CloudOption }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-3 space-y-2">
      <button
        className="flex items-center justify-between w-full text-left gap-2"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`button-cloud-${option.name.toLowerCase().replace(/\s/g, '-')}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{option.name}</span>
            <a
              href={option.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-primary"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
        </div>
        {isExpanded
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>
      {isExpanded && (
        <div className="space-y-1.5 pt-1 border-t">
          {option.steps.map((step, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function IntegrationCard({ integration }: { integration: DetectedIntegration }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[integration.category] || Radio;
  const colorClass = CATEGORY_COLORS[integration.category] || 'text-muted-foreground';

  return (
    <Card className="p-4 space-y-3">
      <button
        className="flex items-center justify-between w-full text-left gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`button-integration-${integration.name.toLowerCase().replace(/[\s()]/g, '-')}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-full p-2 bg-muted shrink-0`}>
            <Icon className={`w-4 h-4 ${colorClass}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{integration.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{integration.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {integration.detectedIn.length} file{integration.detectedIn.length !== 1 ? 's' : ''}
          </Badge>
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Detected in:</p>
            <div className="flex flex-wrap gap-1">
              {integration.detectedIn.map(f => (
                <Badge key={f} variant="secondary" className="text-xs font-mono">
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {integration.envVars.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Required Environment Variables:</p>
              <div className="flex flex-wrap gap-1">
                {integration.envVars.map(v => (
                  <Badge key={v} variant="secondary" className="text-xs font-mono">
                    <Key className="w-2.5 h-2.5 mr-1" />
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {integration.setupGuide.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Setup Guide:</p>
              <div className="space-y-3">
                {integration.setupGuide.map((step, i) => (
                  <SetupStepCard key={i} step={step} index={i} />
                ))}
              </div>
            </div>
          )}

          {integration.cloudOptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Cloud Hosting Options:</p>
              <div className="space-y-2">
                {integration.cloudOptions.map(opt => (
                  <CloudOptionCard key={opt.name} option={opt} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DatabaseSchemaPanel({ schema }: { schema: DatabaseSchema }) {
  const [showRaw, setShowRaw] = useState(false);

  const baseName = schema.sourceFile.split('/').pop()?.replace(/\.\w+$/, '') || 'schema';

  const handleDownloadSQL = () => {
    const blob = new Blob([schema.migrationSQL], { type: 'text/sql' });
    saveAs(blob, `migration-${schema.type}-${baseName}.sql`);
  };

  const handleDownloadRaw = () => {
    const blob = new Blob([schema.rawContent], { type: 'text/plain' });
    const ext = schema.type === 'prisma' ? 'prisma' : 'ts';
    saveAs(blob, `${baseName}.${ext}`);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-blue-500/10">
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium capitalize">{schema.type} Schema</p>
            <p className="text-xs text-muted-foreground font-mono">{schema.sourceFile}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowRaw(!showRaw)}
            data-testid="button-toggle-raw-schema"
          >
            {showRaw ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
            {showRaw ? 'Show SQL' : 'Show Source'}
          </Button>
        </div>
      </div>

      {schema.tables.length > 0 && !showRaw && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {schema.tables.length} table{schema.tables.length !== 1 ? 's' : ''} detected
          </p>
          {schema.tables.map(table => (
            <Card key={table.name} className="p-3">
              <p className="text-sm font-medium font-mono mb-2">{table.name}</p>
              {table.columns.length > 0 ? (
                <div className="space-y-1">
                  {table.columns.map(col => (
                    <div key={col.name} className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-muted-foreground w-32 truncate shrink-0">{col.name}</span>
                      <span className="text-primary">{col.type}</span>
                      {col.constraints.map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px] px-1 py-0">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Columns could not be parsed automatically</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            {showRaw ? 'Original Schema' : 'Generated Migration SQL'}
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={showRaw ? handleDownloadRaw : handleDownloadSQL}
              data-testid="button-download-schema"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[300px]">
          <CodeBlock
            code={showRaw ? schema.rawContent : schema.migrationSQL}
            language={showRaw ? (schema.type === 'prisma' ? 'prisma' : 'typescript') : 'sql'}
          />
        </ScrollArea>
      </div>
    </Card>
  );
}

function EnvTemplatePanel({ envVars, projectName }: { envVars: AnalysisResult['envVariables']; projectName: string }) {
  if (envVars.length === 0) return null;

  const envContent = envVars
    .map(v => `# ${v.description}\n${v.name}=`)
    .join('\n\n');

  const handleDownload = () => {
    const blob = new Blob([envContent], { type: 'text/plain' });
    saveAs(blob, '.env.example');
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-orange-500/10">
            <Key className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Environment Variables</p>
            <p className="text-xs text-muted-foreground">{envVars.length} variable{envVars.length !== 1 ? 's' : ''} detected</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          data-testid="button-download-env"
        >
          <Download className="w-3 h-3 mr-1.5" />
          Download .env.example
        </Button>
      </div>

      <div className="space-y-1">
        {envVars.map(v => (
          <div key={v.name} className="flex items-center gap-2 text-xs py-1">
            <Badge variant="secondary" className="font-mono text-xs shrink-0">
              {v.isSecret && <AlertTriangle className="w-2.5 h-2.5 mr-1 text-orange-500" />}
              {v.name}
            </Badge>
            <span className="text-muted-foreground truncate">{v.description}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">.env.example template</p>
        <CodeBlock code={envContent} />
      </div>
    </Card>
  );
}

export function AnalysisPanel({ analysis, projectName }: AnalysisPanelProps) {
  const hasDatabases = analysis.databases.length > 0;
  const hasIntegrations = analysis.integrations.length > 0;
  const hasEnvVars = analysis.envVariables.length > 0;
  const hasFindings = hasDatabases || hasIntegrations || hasEnvVars;

  if (!hasFindings) {
    return (
      <Card className="p-6 text-center space-y-2">
        <div className="rounded-full bg-muted p-3 w-fit mx-auto">
          <Info className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No integrations or databases detected</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          This project doesn't appear to use any databases or third-party services that need additional setup.
        </p>
      </Card>
    );
  }

  const defaultTab = hasDatabases ? 'database' : hasIntegrations ? 'integrations' : 'env';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileCode className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Project Analysis</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {hasDatabases && (
          <Card className="p-3 flex items-center gap-3">
            <div className="rounded-full p-2 bg-blue-500/10">
              <Database className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="text-db-count">{analysis.databases.length}</p>
              <p className="text-xs text-muted-foreground">Database Schema{analysis.databases.length !== 1 ? 's' : ''}</p>
            </div>
          </Card>
        )}
        {hasIntegrations && (
          <Card className="p-3 flex items-center gap-3">
            <div className="rounded-full p-2 bg-purple-500/10">
              <Radio className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="text-integration-count">{analysis.integrations.length}</p>
              <p className="text-xs text-muted-foreground">Integration{analysis.integrations.length !== 1 ? 's' : ''}</p>
            </div>
          </Card>
        )}
        {hasEnvVars && (
          <Card className="p-3 flex items-center gap-3">
            <div className="rounded-full p-2 bg-orange-500/10">
              <Key className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="text-env-count">{analysis.envVariables.length}</p>
              <p className="text-xs text-muted-foreground">Env Variable{analysis.envVariables.length !== 1 ? 's' : ''}</p>
            </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start">
          {hasDatabases && (
            <TabsTrigger value="database" data-testid="tab-database">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Database
            </TabsTrigger>
          )}
          {hasIntegrations && (
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Radio className="w-3.5 h-3.5 mr-1.5" />
              Integrations
            </TabsTrigger>
          )}
          {hasEnvVars && (
            <TabsTrigger value="env" data-testid="tab-env">
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Environment
            </TabsTrigger>
          )}
        </TabsList>

        {hasDatabases && (
          <TabsContent value="database" className="space-y-4">
            {analysis.databases.map((db, i) => (
              <DatabaseSchemaPanel key={i} schema={db} />
            ))}

            {analysis.databases.some(db => db.type === 'drizzle' || db.type === 'prisma') && (
              <Card className="p-4 space-y-3 border-primary/20">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Database Migration Tips</p>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    The SQL migration above can be used to set up your database on any PostgreSQL provider.
                    You can either:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Run the SQL directly in your database client (pgAdmin, DBeaver, psql)</li>
                    <li>Use the ORM's migration tool (e.g., <code className="bg-muted px-1 rounded">npx drizzle-kit push</code> for Drizzle)</li>
                    <li>Use a cloud provider's SQL editor (Supabase, Neon, etc.)</li>
                  </ul>
                  <p>
                    Check the cloud hosting options in the Integrations tab for PostgreSQL providers with free tiers.
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        )}

        {hasIntegrations && (
          <TabsContent value="integrations" className="space-y-3">
            {analysis.integrations.map(integration => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
          </TabsContent>
        )}

        {hasEnvVars && (
          <TabsContent value="env">
            <EnvTemplatePanel envVars={analysis.envVariables} projectName={projectName} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
