import { RelativePattern, Uri, workspace } from 'vscode';
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
  return convertFilesToK8sResources(resourceFiles);
}

export async function getResourcesFromFolderWithDirty(folderPath: string, dirtyFiles: FileWithContent[]): Promise<Resource[]> {
  const resourceFiles = await findYamlFiles(folderPath);
  const allCleanFiles = resourceFiles.filter(file => !dirtyFiles.find(dirtyFile => dirtyFile.path === file.path));

  const cleanResources = await convertFilesToK8sResources(allCleanFiles);
  const dirtyResources  = (await Promise.all(dirtyFiles.map(async file => getResourcesFromFileAndContent(file.path, file.content)))).flat();

  return [...cleanResources, ...dirtyResources];
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

export function getCachedResourceCount(filePath: string) {
  return resourcePerFileCache.get(filePath) ?? null;
}

async function convertFilesToK8sResources(files: File[]) {
  return (await Promise.all(files.map(async file => {
    const contentRaw = await workspace.fs.readFile(Uri.file(file.path));
    const content = Buffer.from(contentRaw.buffer).toString('utf8');

    const fileWithContent = {
      id: file.id,
      path: file.path,
      content
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
  const files = await workspace.findFiles(new RelativePattern(folderPath, '**/*.{yaml,yml}'));

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
