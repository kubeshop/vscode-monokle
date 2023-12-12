import { RelativePattern, TextDocument, Uri, workspace } from 'vscode';
import { generateId } from './helpers';
import { basename } from 'path';
import { extractK8sResources } from './parser';

export type File = {
  id: string;
  name: string;
  path: string;
};

export type FileWithContent = {
  id: string;
  path: string;
  content: string;
};

export type Resources = Awaited<ReturnType<typeof getResourcesFromFile>>;
export type Resource = Resources[0];

const resourcePerFileCache = new Map<string, string>(); // <file path, resource ids>

export async function getResourcesFromFolder(folderPath: string): Promise<Resource[]> {
  const resourceFiles = await findYamlFiles(folderPath);
  const dirtyFiles = workspace.textDocuments.filter(document => document.isDirty);

  return convertFilesToK8sResources(resourceFiles, dirtyFiles);
}

export async function getResourcesFromFile(filePath: string) {
  const file = {
    id: generateId(filePath),
    name: basename(filePath),
    path: filePath
  };

  const resources = file ? await convertFilesToK8sResources([file]) : [];
  return resources;
}

export async function getResourcesFromFileAndContent(filePath: string, content: string) {
  const file = {
    id: generateId(filePath),
    name: basename(filePath),
    path: filePath
  };

  return extractResources({
    id: file.id,
    path: file.path,
    content
  });
}

export function isYamlFile(path: string) {
  return path.endsWith('.yaml') || path.endsWith('.yml');
}

export function getFileCacheId(filePath: string) {
  return resourcePerFileCache.get(filePath) ?? null;
}

export function isSubpath(path: Uri, subpath: string) {
  const subpathUri = Uri.file(subpath);

  return subpathUri.toString().startsWith(path.toString());
}

async function convertFilesToK8sResources(files: File[], dirtyFiles?: TextDocument[]) {
  return (await Promise.all(files.map(async file => {
    let contentFull = '';
    let isFileDirty = false;
    if (dirtyFiles?.length) {
      const dirtyFile = dirtyFiles.find(dirtyFile => dirtyFile.uri.toString() === Uri.file(file.path).toString());
      if (dirtyFile) {
        isFileDirty = true;
        contentFull = dirtyFile.getText();
      }
    }

    if (!isFileDirty) {
      const contentRaw = await workspace.fs.readFile(Uri.file(file.path));
      contentFull = Buffer.from(contentRaw.buffer).toString('utf8');
    }

    const fileWithContent = {
      id: file.id,
      path: file.path,
      content: contentFull
    };

    return extractResources(fileWithContent);
  }))).flat();
}

async function extractResources(file: FileWithContent) {
  const resources = await extractK8sResources([file]);
  const ids = resources.map(resource => resource.id).sort().join(',');

  resourcePerFileCache.set(file.path, ids);

  return resources;
}

async function findYamlFiles(folderPath: string): Promise<File[]> {
  const files = await workspace.findFiles(
    new RelativePattern(folderPath, '**/*.{yaml,yml}'),
    new RelativePattern(folderPath, '**/node_modules/**')
  );

  return files
    .map(file => {
      const fullPath = file.fsPath;

      return {
        id: generateId(fullPath),
        name: basename(fullPath),
        path: fullPath
      };
    });
}
