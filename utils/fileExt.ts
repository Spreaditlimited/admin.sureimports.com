export default function getFileExt(filename: any): any {
  const parts = filename.split('.');
  return parts[parts.length - 1];
}
