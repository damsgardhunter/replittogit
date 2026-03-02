import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image,
  Database,
  Settings,
  GitBranch,
  Package,
} from "lucide-react";
import { SiTypescript, SiJavascript, SiReact, SiPython, SiHtml5, SiCss3 } from "react-icons/si";
import { formatFileSize } from "@/lib/converter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  size?: number;
  status?: 'removed' | 'added' | 'unchanged';
}

interface FileTreeProps {
  files: { path: string; size: number }[];
  removedFiles?: string[];
  addedFiles?: string[];
  title: string;
  emptyMessage?: string;
}

function buildTree(files: { path: string; size: number }[], removedFiles: string[] = [], addedFiles: string[] = []): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let existing = current.find(n => n.name === part && n.isFolder === !isLast);

      if (!existing) {
        let status: 'removed' | 'added' | 'unchanged' = 'unchanged';
        if (isLast) {
          if (removedFiles.includes(file.path)) status = 'removed';
          else if (addedFiles.includes(file.path)) status = 'added';
        }

        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
          size: isLast ? file.size : undefined,
          status: isLast ? status : undefined,
        };
        current.push(existing);
      }

      if (!isLast) {
        current = existing.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => { if (n.isFolder) sortNodes(n.children); });
  };

  sortNodes(root);
  return root;
}

function getFileIconComponent(name: string, isFolder: boolean) {
  if (isFolder) return null;

  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'ts':
      return <SiTypescript className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case 'tsx':
      return <SiReact className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <SiJavascript className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    case 'jsx':
      return <SiReact className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    case 'py':
      return <SiPython className="w-3.5 h-3.5 text-green-600 shrink-0" />;
    case 'html':
      return <SiHtml5 className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    case 'css':
      return <SiCss3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-yellow-600 shrink-0" />;
    case 'md':
      return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico':
      return <Image className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case 'sql':
      return <Database className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    case 'env':
      return <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    case 'lock':
      return <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    default:
      break;
  }

  if (name === '.gitignore') return <GitBranch className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  if (name === 'package.json') return <Package className="w-3.5 h-3.5 text-green-500 shrink-0" />;

  return <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function TreeNodeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  const statusClasses = {
    removed: 'text-destructive line-through opacity-60',
    added: 'text-green-600 dark:text-green-400',
    unchanged: '',
  };

  if (node.isFolder) {
    return (
      <div>
        <button
          data-testid={`tree-folder-${node.path}`}
          className="flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded-sm hover-elevate text-sm"
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          }
          {isOpen
            ? <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            : <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          }
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isOpen && node.children.map(child => (
          <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid={`tree-file-${node.path}`}
      className={`flex items-center gap-1.5 py-0.5 px-1 text-sm ${statusClasses[node.status || 'unchanged']}`}
      style={{ paddingLeft: `${depth * 16 + 22}px` }}
    >
      {getFileIconComponent(node.name, false) || <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      <span className="truncate">{node.name}</span>
      {node.size !== undefined && (
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {formatFileSize(node.size)}
        </span>
      )}
    </div>
  );
}

export function FileTree({ files, removedFiles = [], addedFiles = [], title, emptyMessage }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files, removedFiles, addedFiles), [files, removedFiles, addedFiles]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Folder className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{files.length} files</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1 px-1 font-mono text-[13px]">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <File className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{emptyMessage || 'No files'}</p>
            </div>
          ) : (
            tree.map(node => <TreeNodeItem key={node.path} node={node} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
