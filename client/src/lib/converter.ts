export interface FileEntry {
  path: string;
  content: string | ArrayBuffer;
  isText: boolean;
  size: number;
}

export interface SetupInfo {
  nodeVersion: string | null;
  requiredNodeVersion: string | null;
  hasTypeScript: boolean;
  projectType: string;
  packageManager: string;
  startScript: string | null;
  needsCrossEnv: boolean;
  portPatched: boolean;
}

export interface ConversionResult {
  originalFiles: FileEntry[];
  convertedFiles: FileEntry[];
  removedFiles: string[];
  addedFiles: string[];
  modifiedFiles: string[];
  unchanged: string[];
  setupInfo: SetupInfo;
}

const REPLIT_SPECIFIC_FILES = [
  '.replit',
  'replit.nix',
  '.upm/',
  '.cache/',
  '.config/',
  '.local/',
  'replit.md',
  '.breakpoints',
  '.replit.nix',
  'generated-icon.png',
];

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md',
  '.txt', '.yml', '.yaml', '.toml', '.env', '.gitignore', '.sh',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.xml', '.svg', '.sql', '.graphql', '.prisma', '.lock',
  '.cfg', '.ini', '.conf', '.map', '.mjs', '.cjs',
]);

export function isTextFile(path: string): boolean {
  const ext = '.' + path.split('.').pop()?.toLowerCase();
  const basename = path.split('/').pop() || '';
  if (['Makefile', 'Dockerfile', 'Procfile', '.gitignore', '.env', 'LICENSE'].includes(basename)) {
    return true;
  }
  return TEXT_EXTENSIONS.has(ext);
}

export function isReplitSpecific(path: string): boolean {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return REPLIT_SPECIFIC_FILES.some(replitFile => {
    if (replitFile.endsWith('/')) {
      return normalizedPath.startsWith(replitFile) || normalizedPath === replitFile.slice(0, -1);
    }
    return normalizedPath === replitFile || normalizedPath.endsWith('/' + replitFile);
  });
}

function generateGitignore(projectType: string): string {
  const common = `# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`;

  if (projectType === 'node') {
    return common + `
# Node specific
coverage/
.nyc_output/
`;
  }

  if (projectType === 'python') {
    return common + `
# Python specific
__pycache__/
*.py[cod]
*$py.class
.Python
venv/
.venv/
`;
  }

  return common;
}

function generateVSCodeSettings(): string {
  return JSON.stringify({
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.tabSize": 2,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "typescript.preferences.importModuleSpecifier": "relative"
  }, null, 2);
}

function generateVSCodeExtensions(projectType: string): string {
  const extensions: string[] = [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
  ];

  if (projectType === 'node') {
    extensions.push(
      "bradlc.vscode-tailwindcss",
      "dsznajder.es7-react-js-snippets",
    );
  }

  if (projectType === 'python') {
    extensions.push(
      "ms-python.python",
      "ms-python.vscode-pylance",
    );
  }

  return JSON.stringify({ recommendations: extensions }, null, 2);
}

function detectProjectType(files: FileEntry[]): string {
  const hasPackageJson = files.some(f => f.path.endsWith('package.json'));
  const hasPyFiles = files.some(f => f.path.endsWith('.py'));
  const hasRequirements = files.some(f => f.path.endsWith('requirements.txt'));

  if (hasPackageJson) return 'node';
  if (hasPyFiles || hasRequirements) return 'python';
  return 'generic';
}

function parseMinNodeVersion(engineRange: string): string | null {
  const match = engineRange.match(/(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    if (major >= 14 && major <= 30) return String(major);
  }
  return null;
}

function inferNodeVersionFromDeps(allDeps: Record<string, string>): string {
  const viteVersion = allDeps['vite'];
  if (viteVersion) {
    const majorMatch = viteVersion.match(/(\d+)/);
    const major = majorMatch ? parseInt(majorMatch[1]) : 0;
    if (major >= 6) return '20';
    return '18';
  }
  if (allDeps['next']) {
    const majorMatch = allDeps['next'].match(/(\d+)/);
    const major = majorMatch ? parseInt(majorMatch[1]) : 0;
    if (major >= 14) return '20';
    return '18';
  }
  return '18';
}

function detectSetupInfo(files: FileEntry[], projectType: string): SetupInfo {
  const info: SetupInfo = {
    nodeVersion: null,
    requiredNodeVersion: null,
    hasTypeScript: files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path === 'tsconfig.json'),
    projectType,
    packageManager: 'npm',
    startScript: null,
    needsCrossEnv: false,
    portPatched: false,
  };

  if (files.some(f => f.path === 'yarn.lock' || f.path.endsWith('/yarn.lock'))) {
    info.packageManager = 'yarn';
  } else if (files.some(f => f.path === 'pnpm-lock.yaml' || f.path.endsWith('/pnpm-lock.yaml'))) {
    info.packageManager = 'pnpm';
  }

  const pkgFile = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
  if (pkgFile && typeof pkgFile.content === 'string') {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

      if (pkg.engines?.node) {
        info.requiredNodeVersion = pkg.engines.node;
        const parsed = parseMinNodeVersion(pkg.engines.node);
        if (parsed) {
          info.nodeVersion = parsed;
        }
      }

      if (!info.nodeVersion) {
        info.nodeVersion = inferNodeVersionFromDeps(allDeps);
      }

      const pm = info.packageManager;
      const runPrefix = pm === 'npm' ? 'npm run' : pm;
      const scripts = pkg.scripts || {};
      if (scripts.dev) {
        info.startScript = `${runPrefix} dev`;
      } else if (scripts.start) {
        info.startScript = `${pm === 'npm' ? 'npm' : pm} start`;
      } else if (scripts.serve) {
        info.startScript = `${runPrefix} serve`;
      } else if (scripts.preview) {
        info.startScript = `${runPrefix} preview`;
      }
    } catch {}
  }

  if (projectType === 'python') {
    info.nodeVersion = null;
    info.startScript = null;
  }

  return info;
}

function generateReadme(projectName: string, setupInfo: SetupInfo): string {
  const pm = setupInfo.packageManager;
  const installCmd = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : 'pnpm install';
  const startCmd = setupInfo.startScript || (pm === 'npm' ? 'npm run dev' : `${pm} dev`);
  const nodeVer = setupInfo.nodeVersion || '20';

  let readme = `# ${projectName}

Converted from Replit for local development.

## Prerequisites

- **Node.js ${nodeVer}.x or later** (check with \`node -v\`)
  - Download from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
  - If using nvm: \`nvm install ${nodeVer} && nvm use ${nodeVer}\`
  - On Windows with nvm-windows: \`nvm install ${nodeVer} && nvm use ${nodeVer}\`
`;

  if (pm !== 'npm') {
    readme += `- **${pm}** package manager
`;
  }

  readme += `
## Getting Started

\`\`\`bash
# Install dependencies
${installCmd}

# Start development server
${startCmd}
\`\`\`
`;

  if (setupInfo.projectType === 'node') {
    readme += `
## Windows Users

Scripts using \`NODE_ENV=...\` syntax don't work on Windows natively. This project has been
patched to use \`cross-env\` which handles this automatically. If you see environment variable
errors, make sure \`cross-env\` is installed:
\`\`\`bash
${installCmd}
\`\`\`

## Deployment

The server uses \`process.env.PORT\` so it works on any hosting platform (Railway, Render,
Heroku, Fly.io, etc.). Set the \`PORT\` environment variable in your hosting dashboard, or
it will default to 5000 locally.

## Troubleshooting

### "Unsupported engine" warnings
Your Node.js version is too old. Update to Node.js ${nodeVer}.x or later:
\`\`\`bash
# Using nvm (recommended)
nvm install ${nodeVer}
nvm use ${nodeVer}

# Or download directly from https://nodejs.org/
\`\`\`

### "ENOSPC: no space left on device" error
Free up disk space and try again:
\`\`\`bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
${pm === 'npm' ? 'rm -rf node_modules package-lock.json' : pm === 'yarn' ? 'rm -rf node_modules yarn.lock' : 'rm -rf node_modules pnpm-lock.yaml'}
# On Windows: rd /s /q node_modules
${installCmd}
\`\`\`

### "EPERM" or permission errors on Windows
Close VS Code and any terminals, then delete the node_modules folder manually:
\`\`\`powershell
# PowerShell (run as Administrator if needed)
Remove-Item -Recurse -Force node_modules
${installCmd}
\`\`\`

### "esbuild" or native module errors
Reinstall with the correct platform binaries:
\`\`\`bash
rm -rf node_modules
${installCmd}
\`\`\`
`;
  }

  if (setupInfo.projectType === 'python') {
    readme += `
## Troubleshooting

### Virtual environment setup
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`
`;
  }

  readme += `
## Environment Variables

Copy the \`.env.example\` file (if present) to \`.env\` and fill in your values:
\`\`\`bash
cp .env.example .env
\`\`\`

## Notes

- This project was converted from Replit. Replit-specific configuration files have been removed.
- Check the \`.env.example\` file for required environment variables.
- Database migration SQL files (if any) are in the \`migrations/\` folder.
`;

  return readme;
}

function needsCrossEnvPrefix(script: string): boolean {
  if (script.startsWith('cross-env ')) return false;
  return /^[A-Z_]+=\S+/.test(script);
}

function patchPackageJson(content: string): { patched: string; needsCrossEnv: boolean } {
  try {
    const pkg = JSON.parse(content);
    let needsCrossEnv = false;

    if (pkg.scripts) {
      for (const [key, value] of Object.entries(pkg.scripts)) {
        if (typeof value === 'string' && needsCrossEnvPrefix(value)) {
          pkg.scripts[key] = `cross-env ${value}`;
          needsCrossEnv = true;
        }
      }
    }

    if (needsCrossEnv) {
      if (!pkg.devDependencies) pkg.devDependencies = {};
      if (!pkg.devDependencies['cross-env']) {
        pkg.devDependencies['cross-env'] = '^7.0.3';
      }
    }

    return { patched: JSON.stringify(pkg, null, 2), needsCrossEnv };
  } catch {
    return { patched: content, needsCrossEnv: false };
  }
}

function patchServerPort(content: string): { patched: string; changed: boolean } {
  if (content.includes('process.env.PORT')) {
    return { patched: content, changed: false };
  }

  const hardcodedListen = /app\.listen\(\s*(\d+)\s*(?:,\s*(?:\(\)\s*=>|function\s*\())/;
  const match = content.match(hardcodedListen);
  if (match) {
    const port = match[1];
    const patched = content.replace(
      hardcodedListen,
      `const PORT = process.env.PORT || ${port};\napp.listen(PORT, () =>`
    );
    return { patched, changed: true };
  }

  const simpleListen = /app\.listen\(\s*(\d+)\s*\)/;
  const simpleMatch = content.match(simpleListen);
  if (simpleMatch) {
    const port = simpleMatch[1];
    const patched = content.replace(
      simpleListen,
      `const PORT = process.env.PORT || ${port};\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n})`
    );
    return { patched, changed: true };
  }

  return { patched: content, changed: false };
}

export function convertProject(files: FileEntry[]): ConversionResult {
  const removedFiles: string[] = [];
  const addedFiles: string[] = [];
  const unchanged: string[] = [];
  const convertedFiles: FileEntry[] = [];
  const modifiedFiles: string[] = [];

  const projectType = detectProjectType(files);
  const setupInfo = detectSetupInfo(files, projectType);

  for (const file of files) {
    if (isReplitSpecific(file.path)) {
      removedFiles.push(file.path);
    } else if (file.path === 'package.json' || file.path.endsWith('/package.json')) {
      if (typeof file.content === 'string') {
        const { patched, needsCrossEnv } = patchPackageJson(file.content);
        convertedFiles.push({ ...file, content: patched, size: patched.length });
        if (needsCrossEnv) {
          modifiedFiles.push(file.path);
          setupInfo.needsCrossEnv = true;
        } else {
          unchanged.push(file.path);
        }
      } else {
        convertedFiles.push({ ...file });
        unchanged.push(file.path);
      }
    } else if (
      typeof file.content === 'string' &&
      file.isText &&
      (file.path.match(/server\.(ts|js|mjs)$/) || file.path.match(/index\.(ts|js|mjs)$/) || file.path.match(/app\.(ts|js|mjs)$/))
    ) {
      const { patched, changed } = patchServerPort(file.content);
      if (changed) {
        convertedFiles.push({ ...file, content: patched, size: patched.length });
        modifiedFiles.push(file.path);
        setupInfo.portPatched = true;
      } else {
        convertedFiles.push({ ...file });
        unchanged.push(file.path);
      }
    } else {
      convertedFiles.push({ ...file });
      unchanged.push(file.path);
    }
  }

  const hasGitignore = files.some(f => f.path === '.gitignore' || f.path.endsWith('/.gitignore'));
  if (!hasGitignore) {
    const content = generateGitignore(projectType);
    convertedFiles.push({
      path: '.gitignore',
      content,
      isText: true,
      size: content.length,
    });
    addedFiles.push('.gitignore');
  }

  const hasVSCodeSettings = files.some(f => f.path.includes('.vscode/settings.json'));
  if (!hasVSCodeSettings) {
    const settingsContent = generateVSCodeSettings();
    convertedFiles.push({
      path: '.vscode/settings.json',
      content: settingsContent,
      isText: true,
      size: settingsContent.length,
    });
    addedFiles.push('.vscode/settings.json');

    const extensionsContent = generateVSCodeExtensions(projectType);
    convertedFiles.push({
      path: '.vscode/extensions.json',
      content: extensionsContent,
      isText: true,
      size: extensionsContent.length,
    });
    addedFiles.push('.vscode/extensions.json');
  }

  const hasReadme = files.some(f => {
    const name = f.path.split('/').pop()?.toLowerCase();
    return name === 'readme.md';
  });
  if (!hasReadme) {
    const readmeContent = generateReadme('Project', setupInfo);
    convertedFiles.push({
      path: 'README.md',
      content: readmeContent,
      isText: true,
      size: readmeContent.length,
    });
    addedFiles.push('README.md');
  }

  if (setupInfo.nodeVersion && projectType === 'node') {
    const hasNvmrc = files.some(f => f.path === '.nvmrc' || f.path.endsWith('/.nvmrc'));
    if (!hasNvmrc) {
      const nvmrcContent = setupInfo.nodeVersion + '\n';
      convertedFiles.push({
        path: '.nvmrc',
        content: nvmrcContent,
        isText: true,
        size: nvmrcContent.length,
      });
      addedFiles.push('.nvmrc');
    }
  }

  convertedFiles.sort((a, b) => a.path.localeCompare(b.path));

  return {
    originalFiles: files,
    convertedFiles,
    removedFiles,
    addedFiles,
    modifiedFiles,
    unchanged,
    setupInfo,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const basename = path.split('/').pop() || '';

  if (basename === '.gitignore') return 'git';
  if (basename === 'package.json') return 'npm';
  if (basename === 'tsconfig.json') return 'ts-config';
  if (basename === 'Dockerfile') return 'docker';
  if (basename === 'README.md') return 'readme';

  const iconMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'react',
    js: 'javascript',
    jsx: 'react',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
    sql: 'database',
    svg: 'image',
    png: 'image',
    jpg: 'image',
    gif: 'image',
    env: 'env',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'config',
    lock: 'lock',
  };

  return iconMap[ext] || 'file';
}
