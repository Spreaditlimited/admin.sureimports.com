export default function fileCheck(
  fileExt: string,
  allowedExt: string[],
): boolean {
  return allowedExt.includes(fileExt);
}
