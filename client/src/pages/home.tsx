import { useState, useCallback } from "react";
import { Code2, Zap, Shield, FolderTree, Database, Radio, Rocket } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { DropZone } from "@/components/drop-zone";
import { ConversionPanel } from "@/components/conversion-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { convertProject, type FileEntry, type ConversionResult } from "@/lib/converter";
import { analyzeProject, type AnalysisResult } from "@/lib/analyzer";
import logoPath from "@assets/Untitled_design_(3)_1772448302617.png";

export default function Home() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [projectName, setProjectName] = useState('project');
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesLoaded = useCallback((files: FileEntry[], name: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const conversionResult = convertProject(files);
      const analysisResult = analyzeProject(files);
      setResult(conversionResult);
      setAnalysis(analysisResult);
      setProjectName(name);
      setIsLoading(false);
    }, 300);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setAnalysis(null);
    setProjectName('project');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Rocket className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-base tracking-tight" data-testid="text-app-title">
              <span className="text-foreground">Repo</span><span className="text-primary">Lift</span>
            </h1>
          </div>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground" aria-label="Main features">
            <span>Convert</span>
            <span>Detect Schemas</span>
            <span>Export</span>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!result ? (
          <div className="space-y-10">
            <div className="text-center space-y-2 pt-4">
              <div className="inline-flex items-center gap-3 justify-center">
                <img src={logoPath} alt="RepoLift" className="w-52 h-52 object-contain rounded-xl" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-hero-title">
                Launch Your Replit Projects to <span className="text-primary">GitHub & VS Code</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Transform your Replit project into a clean, GitHub-ready or VS Code-compatible
                repository. Detects databases, integrations, and generates proper configuration files automatically.
              </p>
            </div>

            <DropZone onFilesLoaded={handleFilesLoaded} isLoading={isLoading} />

            <section aria-label="Features">
              <h3 className="sr-only">Key Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-md bg-card border border-card-border">
                  <div className="rounded-full p-2 bg-destructive/10 shrink-0">
                    <Shield className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Removes Replit Files</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Strips .replit, replit.nix, and other platform-specific configs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-md bg-card border border-card-border">
                  <div className="rounded-full p-2 bg-green-500/10 shrink-0">
                    <FolderTree className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Adds Missing Configs</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Generates .gitignore, VS Code settings, and README automatically
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-md bg-card border border-card-border">
                  <div className="rounded-full p-2 bg-blue-500/10 shrink-0">
                    <Database className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Schema Detection</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Detects database schemas and generates migration SQL for your new environment
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-md bg-card border border-card-border">
                  <div className="rounded-full p-2 bg-purple-500/10 shrink-0">
                    <Radio className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Integration Guides</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Identifies third-party services and provides setup instructions
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-center gap-6 text-muted-foreground pt-2 flex-wrap">
              <div className="flex items-center gap-2">
                <SiGithub className="w-5 h-5" />
                <span className="text-sm">GitHub Ready</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                <span className="text-sm">VS Code Compatible</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="text-sm">Instant & Private</span>
              </div>
            </div>

            <section className="space-y-4 pt-4" aria-label="How it works">
              <h3 className="text-lg font-semibold text-center">How It Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    1
                  </div>
                  <p className="text-sm font-medium mb-1">Upload Your Project</p>
                  <p className="text-xs text-muted-foreground">
                    Drop a ZIP file or select your Replit project folder
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    2
                  </div>
                  <p className="text-sm font-medium mb-1">Review Changes</p>
                  <p className="text-xs text-muted-foreground">
                    See removed Replit files, added configs, detected schemas and integrations
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    3
                  </div>
                  <p className="text-sm font-medium mb-1">Download & Deploy</p>
                  <p className="text-xs text-muted-foreground">
                    Get a clean ZIP ready for GitHub or VS Code with migration files included
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3 pt-2" aria-label="Frequently asked questions">
              <h3 className="text-lg font-semibold text-center">FAQ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <p className="text-sm font-medium mb-1">Is my code uploaded anywhere?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No. All processing happens 100% in your browser. Your files never leave your device.
                  </p>
                </div>
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <p className="text-sm font-medium mb-1">What project types are supported?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Node.js, Python, and generic projects. Database detection supports Drizzle, Prisma, and raw SQL.
                  </p>
                </div>
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <p className="text-sm font-medium mb-1">What files does it remove?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Replit-specific files like .replit, replit.nix, .upm/, .cache/, replit.md, and generated icons.
                  </p>
                </div>
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <p className="text-sm font-medium mb-1">Does it change my code?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No. Your source code stays exactly the same. Only platform config files are removed or added.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <ConversionPanel
            result={result}
            analysis={analysis}
            projectName={projectName}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              All processing happens in your browser. No files are uploaded to any server.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              RepoLift - free Replit to GitHub converter. Export your projects with proper configs, database schemas, and integration guides.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Rocket className="w-3 h-3 text-primary" />
            <span><span className="text-foreground font-medium">Repo</span><span className="text-primary font-medium">Lift</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
