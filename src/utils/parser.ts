export async function extractK8sResources(files: any[]) {
  const { extractK8sResources: extract } = await import('@monokle/parser');
  return extract(files, false, true);
}
