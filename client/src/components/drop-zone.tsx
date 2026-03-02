import { useState, useCallback, useRef } from "react";
import { Upload, FolderOpen, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileEntry } from "@/lib/converter";
import { isTextFile } from "@/lib/converter";
import JSZip from "jszip";

interface DropZoneProps {
  onFilesLoaded: (files: FileEntry[], projectName: string) => void;
  isLoading: boolean;
}

const SKIP_DIRS = ['node_modules', '.git', '.cache', '__pycache__'];

function shouldSkipPath(path: string): boolean {
  return SKIP_DIRS.some(dir => path.includes(dir + '/') || path === dir);
}

async function readEntryRecursive(
  entry: FileSystemEntry,
  basePath: string,
  results: { file: File; path: string }[]
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (!shouldSkipPath(fullPath)) {
      results.push({ file, path: fullPath });
    }
  } else if (entry.isDirectory) {
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (shouldSkipPath(dirPath)) return;

    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();

    let allEntries: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      allEntries = allEntries.concat(batch);
    } while (batch.length > 0);

    for (const child of allEntries) {
      await readEntryRecursive(child, dirPath, results);
    }
  }
}

export function DropZone({ onFilesLoaded, isLoading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFileEntries = useCallback(async (
    entries: { file: File; path: string }[],
    projectName: string,
    stripPrefix: string
  ) => {
    const files: FileEntry[] = [];

    for (const { file, path: rawPath } of entries) {
      let path = rawPath;
      if (stripPrefix && path.startsWith(stripPrefix)) {
        path = path.slice(stripPrefix.length);
      }
      if (!path) continue;

      if (isTextFile(path)) {
        const content = await file.text();
        files.push({ path, content, isText: true, size: file.size });
      } else {
        const content = await file.arrayBuffer();
        files.push({ path, content, isText: false, size: file.size });
      }
    }

    onFilesLoaded(files, projectName);
  }, [onFilesLoaded]);

  const processZip = useCallback(async (file: File) => {
    const files: FileEntry[] = [];
    let projectName = file.name.replace('.zip', '');
    const zip = await JSZip.loadAsync(file);

    const entries = Object.entries(zip.files);
    let commonPrefix = '';
    const filePaths = entries.filter(([, f]) => !f.dir).map(([p]) => p);
    if (filePaths.length > 0) {
      const parts = filePaths[0].split('/');
      if (parts.length > 1) {
        const candidate = parts[0] + '/';
        if (filePaths.every(p => p.startsWith(candidate))) {
          commonPrefix = candidate;
          projectName = parts[0];
        }
      }
    }

    for (const [path, zipEntry] of entries) {
      if (zipEntry.dir) continue;

      let cleanPath = path;
      if (commonPrefix && cleanPath.startsWith(commonPrefix)) {
        cleanPath = cleanPath.slice(commonPrefix.length);
      }
      if (!cleanPath) continue;
      if (shouldSkipPath(cleanPath)) continue;

      if (isTextFile(cleanPath)) {
        const content = await zipEntry.async('string');
        files.push({ path: cleanPath, content, isText: true, size: content.length });
      } else {
        const content = await zipEntry.async('arraybuffer');
        files.push({ path: cleanPath, content, isText: false, size: content.byteLength });
      }
    }

    onFilesLoaded(files, projectName);
  }, [onFilesLoaded]);

  const processFileList = useCallback(async (fileList: FileList) => {
    const fileArray = Array.from(fileList);

    if (fileArray.length === 1 && fileArray[0].name.endsWith('.zip')) {
      await processZip(fileArray[0]);
      return;
    }

    let projectName = 'project';
    let commonPrefix = '';
    if (fileArray.length > 0 && fileArray[0].webkitRelativePath) {
      const firstPath = fileArray[0].webkitRelativePath;
      const parts = firstPath.split('/');
      if (parts.length > 1) {
        commonPrefix = parts[0] + '/';
        projectName = parts[0];
      }
    }

    const entries = fileArray
      .filter(f => {
        const p = f.webkitRelativePath || f.name;
        return !shouldSkipPath(p);
      })
      .map(f => ({
        file: f,
        path: f.webkitRelativePath || f.name,
      }));

    await processFileEntries(entries, projectName, commonPrefix);
  }, [processFileEntries, processZip]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const firstItem = items[0];
    const firstFile = firstItem.getAsFile();
    if (items.length === 1 && firstFile && firstFile.name.endsWith('.zip')) {
      await processZip(firstFile);
      return;
    }

    const allResults: { file: File; path: string }[] = [];
    const rootEntries: FileSystemEntry[] = [];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        rootEntries.push(entry);
      }
    }

    if (rootEntries.length === 0) {
      const allFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const file = items[i].getAsFile();
        if (file) allFiles.push(file);
      }
      const entries = allFiles.map(f => ({ file: f, path: f.name }));
      await processFileEntries(entries, 'project', '');
      return;
    }

    let projectName = 'project';
    let stripPrefix = '';

    if (rootEntries.length === 1 && rootEntries[0].isDirectory) {
      projectName = rootEntries[0].name;
      stripPrefix = rootEntries[0].name + '/';
    }

    for (const entry of rootEntries) {
      await readEntryRecursive(entry, '', allResults);
    }

    await processFileEntries(allResults, projectName, stripPrefix);
  }, [processZip, processFileEntries]);

  return (
    <div
      data-testid="drop-zone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-md border-2 border-dashed p-12 transition-all duration-200
        flex flex-col items-center justify-center gap-6 cursor-pointer
        ${isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 bg-card'
        }
      `}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className={`
        rounded-full p-4 transition-colors duration-200
        ${isDragging ? 'bg-primary/10' : 'bg-muted'}
      `}>
        <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium">
          {isLoading ? 'Processing files...' : 'Drop your Replit project here'}
        </p>
        <p className="text-sm text-muted-foreground">
          Upload a .zip file or select a folder to convert
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center" onClick={e => e.stopPropagation()}>
        <Button
          data-testid="button-upload-zip"
          variant="default"
          size="default"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <FileArchive className="w-4 h-4 mr-2" />
          Upload ZIP
        </Button>
        <Button
          data-testid="button-upload-folder"
          variant="secondary"
          size="default"
          onClick={() => folderInputRef.current?.click()}
          disabled={isLoading}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Select Folder
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.length) {
            await processFileList(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
        onChange={async (e) => {
          if (e.target.files?.length) {
            await processFileList(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
