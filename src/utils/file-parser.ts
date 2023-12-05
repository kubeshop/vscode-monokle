import { RelativePattern, Uri, workspace } from 'vscode';
import { generateId } from './helpers';
import { basename } from 'path';
import { extractK8sResources } from './parser';

export type File = {
  id: string;
  name: string;
  path: string;
};

export type Resources = Awaited<ReturnType<typeof getResourcesFromFile>>;
export type Resource = Resources[0];

const ResourcePerFileCache = new Map<string, number>(); // <file path, resource count>

export async function getResourcesFromFolder(folderPath: string): Promise<Resource[]> {
  const resourceFiles = await findYamlFiles(folderPath);
  return convertFilesToK8sResources(resourceFiles);
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

  const resources = await extractK8sResources([{
    id: file.id,
    path: file.path,
    content
  }]);

  return resources;
}

export function isYamlFile(path: string) {
  return path.endsWith('.yaml') || path.endsWith('.yml');
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

async function convertFilesToK8sResources(files: File[]): Promise<ReturnType<Awaited<typeof extractK8sResources>>> {
  const filesWithContent = await Promise.all(files.map(async file => {
    const contentRaw = await workspace.fs.readFile(Uri.file(file.path));
    const content = Buffer.from(contentRaw.buffer).toString('utf8');

    return {
      id: file.id,
      path: file.path,
      content
    };
  }));

  return extractK8sResources(filesWithContent);
}





