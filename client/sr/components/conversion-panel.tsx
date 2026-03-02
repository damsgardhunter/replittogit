import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Download,
  ArrowRight,
  Trash2,
  Plus,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Minus,
  Code2,
  Terminal,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileTree } from "@/components/file-tree";
import { AnalysisPanel } from "@/components/analysis-panel";
import type { ConversionResult, SetupInfo } from "@/lib/converter";
import type { AnalysisResult } from "@/lib/analyzer";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1 rounded hover:bg-muted-foreground/10 transition-colors"
      data-testid="button-copy-command"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function SetupGuideNode({ setupInfo }: { setupInfo: SetupInfo }) {
  const pm = setupInfo.packageManager;
  const installCmd = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : 'pnpm install';
  const startCmd = setupInfo.startScript || (pm === 'npm' ? 'npm run dev' : `${pm} dev`);
  const nodeVer = setupInfo.nodeVersion || '20';
  const lockFile = pm === 'npm' ? 'package-lock.json' : pm === 'yarn' ? 'yarn.lock' : 'pnpm-lock.yaml';

  return (
    <Card className="p-5 space-y-4" data-testid="card-setup-guide">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Setup Guide</h3>
        {setupInfo.requiredNodeVersion && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Required: Node {setupInfo.requiredNodeVersion}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
            <p className="text-sm font-medium">Install Node.js {nodeVer}.x or later</p>
          </div>
          <p className="text-xs text-muted-foreground ml-7 mb-1.5">
            Check your version with <code className="bg-muted px-1 py-0.5 rounded text-[11px]">node -v</code>. You need v{nodeVer}.0.0 or higher.
          </p>
          <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs leading-relaxed">
            <CopyButton text={`nvm install ${nodeVer}\nnvm use ${nodeVer}`} />
            <pre className="text-muted-foreground whitespace-pre-wrap pr-8">{`# Using nvm (recommended)\nnvm install ${nodeVer}\nnvm use ${nodeVer}\n\n# Or download from https://nodejs.org/`}</pre>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
            <p className="text-sm font-medium">Install dependencies</p>
          </div>
          <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs">
            <CopyButton text={installCmd} />
            <pre className="text-muted-foreground pr-8">{installCmd}</pre>
          </div>
        </div>

        {setupInfo.startScript && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
              <p className="text-sm font-medium">Start the development server</p>
            </div>
            <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs">
              <CopyButton text={startCmd} />
              <pre className="text-muted-foreground pr-8">{startCmd}</pre>
            </div>
          </div>
        )}
      </div>

      {setupInfo.needsCrossEnv && (
        <div className="border-t pt-3 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs font-medium">Windows Compatibility</p>
          </div>
          <p className="text-xs text-muted-foreground ml-5">
            Scripts like <code className="bg-muted px-1 py-0.5 rounded">NODE_ENV=development</code> don't work on Windows.
            Your package.json has been patched to use <code className="bg-muted px-1 py-0.5 rounded">cross-env</code> which handles this automatically.
          </p>
        </div>
      )}

      {setupInfo.portPatched && (
        <div className="border-t pt-3 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs font-medium">Deployment Ready</p>
          </div>
          <p className="text-xs text-muted-foreground ml-5">
            Server files patched to use <code className="bg-muted px-1 py-0.5 rounded">process.env.PORT</code> so
            your app works on any hosting platform (Railway, Render, Heroku, Fly.io).
          </p>
        </div>
      )}

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium">Common Issues & Fixes</p>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground ml-5">
          <div>
            <p className="font-medium text-foreground/80">"Unsupported engine" warnings</p>
            <p>Your Node.js is too old. Install Node.js {nodeVer}.x using nvm or from nodejs.org.</p>
          </div>
          <div>
            <p className="font-medium text-foreground/80">"ENOSPC: no space left on device"</p>
            <p>Free up disk space, then run <code className="bg-muted px-1 py-0.5 rounded">npm cache clean --force</code> and delete <code className="bg-muted px-1 py-0.5 rounded">node_modules</code> before reinstalling.</p>
          </div>
          <div>
            <p className="font-medium text-foreground/80">"EPERM" or permission errors (Windows)</p>
            <p>Close VS Code and all terminals. Delete the <code className="bg-muted px-1 py-0.5 rounded">node_modules</code> folder manually, then run <code className="bg-muted px-1 py-0.5 rounded">{installCmd}</code> again.</p>
          </div>
          <div>
            <p className="font-medium text-foreground/80">"esbuild" binary errors</p>
            <p>Delete <code className="bg-muted px-1 py-0.5 rounded">node_modules</code> and <code className="bg-muted px-1 py-0.5 rounded">{lockFile}</code>, then run <code className="bg-muted px-1 py-0.5 rounded">{installCmd}</code> to get fresh platform-specific binaries.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SetupGuidePython() {
  return (
    <Card className="p-5 space-y-4" data-testid="card-setup-guide">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Setup Guide</h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
            <p className="text-sm font-medium">Create a virtual environment</p>
          </div>
          <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs leading-relaxed">
            <CopyButton text="python -m venv venv" />
            <pre className="text-muted-foreground whitespace-pre-wrap pr-8">python -m venv venv</pre>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
            <p className="text-sm font-medium">Activate the environment</p>
          </div>
          <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs leading-relaxed">
            <CopyButton text="source venv/bin/activate" />
            <pre className="text-muted-foreground whitespace-pre-wrap pr-8">{`# macOS/Linux\nsource venv/bin/activate\n\n# Windows\nvenv\\Scripts\\activate`}</pre>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
            <p className="text-sm font-medium">Install dependencies</p>
          </div>
          <div className="ml-7 bg-muted/50 rounded-md p-3 relative font-mono text-xs">
            <CopyButton text="pip install -r requirements.txt" />
            <pre className="text-muted-foreground pr-8">pip install -r requirements.txt</pre>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SetupGuide({ setupInfo }: { setupInfo: SetupInfo }) {
  if (setupInfo.projectType === 'python') return <SetupGuidePython />;
  return <SetupGuideNode setupInfo={setupInfo} />;
}

interface ConversionPanelProps {
  result: ConversionResult;
  analysis: AnalysisResult | null;
  projectName: string;
  onReset: () => void;
}

export function ConversionPanel({ result, analysis, projectName, onReset }: ConversionPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'github' | 'vscode') => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(projectName) || zip;

      for (const file of result.convertedFiles) {
        if (format === 'github' && file.path.startsWith('.vscode/')) continue;

        if (typeof file.content === 'string') {
          folder.file(file.path, file.content);
        } else {
          folder.file(file.path, file.content);
        }
      }

      if (analysis && analysis.databases.length > 0) {
        for (let i = 0; i < analysis.databases.length; i++) {
          const db = analysis.databases[i];
          if (db.migrationSQL && db.migrationSQL !== '-- No tables detected') {
            const baseName = db.sourceFile.split('/').pop()?.replace(/\.\w+$/, '') || 'schema';
            const suffix = analysis.databases.length > 1 ? `-${baseName}` : '';
            folder.file(`migrations/migration-${db.type}${suffix}.sql`, db.migrationSQL);
          }
        }
      }

      if (analysis && analysis.envVariables.length > 0) {
        const envContent = analysis.envVariables
          .map(v => `# ${v.description}\n${v.name}=`)
          .join('\n\n');
        folder.file('.env.example', envContent);
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const suffix = format === 'github' ? 'github' : 'vscode';
      saveAs(blob, `${projectName}-${suffix}.zip`);
    } finally {
      setIsDownloading(false);
    }
  };

  const originalFiles = result.originalFiles.map(f => ({ path: f.path, size: f.size }));
  const convertedFilesForTree = result.convertedFiles.map(f => ({ path: f.path, size: f.size }));

  const hasAnalysisFindings = analysis && (
    analysis.databases.length > 0 ||
    analysis.integrations.length > 0 ||
    analysis.envVariables.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-project-name">{projectName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.originalFiles.length} files processed
            {hasAnalysisFindings && ' - integrations & database detected'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="button-reset"
            variant="secondary"
            size="default"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-destructive/10">
            <Minus className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-removed-count">{result.removedFiles.length}</p>
            <p className="text-xs text-muted-foreground">Removed</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-green-500/10">
            <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-added-count">{result.addedFiles.length}</p>
            <p className="text-xs text-muted-foreground">Added</p>
          </div>
        </Card>
        {result.modifiedFiles.length > 0 && (
          <Card className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-modified-count">{result.modifiedFiles.length}</p>
              <p className="text-xs text-muted-foreground">Modified</p>
            </div>
          </Card>
        )}
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full p-2 bg-primary/10">
            <FileCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-total-count">{result.convertedFiles.length}</p>
            <p className="text-xs text-muted-foreground">Total Output</p>
          </div>
        </Card>
      </div>

      {(result.removedFiles.length > 0 || result.addedFiles.length > 0 || result.modifiedFiles.length > 0) && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium">Changes Summary</h3>
          {result.removedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <Trash2 className="w-3 h-3" />
                <span>Replit-specific files removed</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.removedFiles.map(f => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="text-xs font-mono"
                    data-testid={`badge-removed-${f}`}
                  >
                    <AlertCircle className="w-3 h-3 mr-1 text-destructive" />
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {result.addedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <Plus className="w-3 h-3" />
                <span>New files added</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.addedFiles.map(f => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="text-xs font-mono"
                    data-testid={`badge-added-${f}`}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {result.modifiedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Files patched for compatibility</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.modifiedFiles.map(f => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="text-xs font-mono"
                    data-testid={`badge-modified-${f}`}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                    {f}
                  </Badge>
                ))}
              </div>
              {result.setupInfo.needsCrossEnv && (
                <p className="text-xs text-muted-foreground ml-4">
                  Added <code className="bg-muted px-1 py-0.5 rounded">cross-env</code> to npm scripts for Windows compatibility
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="comparison" data-testid="tab-comparison">
            Side by Side
          </TabsTrigger>
          <TabsTrigger value="original" data-testid="tab-original">
            Original
          </TabsTrigger>
          <TabsTrigger value="converted" data-testid="tab-converted">
            Converted
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="h-[400px] flex flex-col">
              <FileTree
                files={originalFiles}
                removedFiles={result.removedFiles}
                title="Replit Project"
                emptyMessage="No files loaded"
              />
            </Card>
            <Card className="h-[400px] flex flex-col relative">
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 hidden md:block">
                <div className="rounded-full bg-primary p-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
              <FileTree
                files={convertedFilesForTree}
                addedFiles={result.addedFiles}
                title="GitHub / VS Code"
                emptyMessage="No output files"
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="original">
          <Card className="h-[400px] flex flex-col">
            <FileTree
              files={originalFiles}
              removedFiles={result.removedFiles}
              title="Replit Project (Original)"
              emptyMessage="No files loaded"
            />
          </Card>
        </TabsContent>

        <TabsContent value="converted">
          <Card className="h-[400px] flex flex-col">
            <FileTree
              files={convertedFilesForTree}
              addedFiles={result.addedFiles}
              title="GitHub / VS Code (Converted)"
              emptyMessage="No output files"
            />
          </Card>
        </TabsContent>
      </Tabs>

      {analysis && (
        <>
          <Separator />
          <AnalysisPanel analysis={analysis} projectName={projectName} />
        </>
      )}

      <Separator />

      <SetupGuide setupInfo={result.setupInfo} />

      <Separator />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          data-testid="button-download-github"
          size="lg"
          className="flex-1"
          onClick={() => handleDownload('github')}
          disabled={isDownloading}
        >
          <SiGithub className="w-4 h-4 mr-2" />
          Download for GitHub
          <Download className="w-4 h-4 ml-2" />
        </Button>
        <Button
          data-testid="button-download-vscode"
          size="lg"
          variant="secondary"
          className="flex-1"
          onClick={() => handleDownload('vscode')}
          disabled={isDownloading}
        >
          <Code2 className="w-4 h-4 mr-2" />
          Download for VS Code
          <Download className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {hasAnalysisFindings && (
        <p className="text-xs text-muted-foreground text-center">
          Downloads include migration SQL files, .env.example template, and .nvmrc when applicable
        </p>
      )}
    </div>
  );
}
