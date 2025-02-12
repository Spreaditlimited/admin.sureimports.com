export default function validFile(fileExt: any): any {
  if (
    fileExt == 'jpg' ||
    fileExt == 'JPG' ||
    fileExt == 'jpeg' ||
    fileExt == 'JPEG' ||
    fileExt == 'png' ||
    fileExt == 'PNG' ||
    fileExt == 'bmp' ||
    fileExt == 'BMP' ||
    fileExt == 'gif' ||
    fileExt == 'GIF' ||
    fileExt == 'psd' ||
    fileExt == 'PSD' ||
    fileExt == 'ai' ||
    fileExt == 'AI'
  ) {
    return { success: true, message: 'Valid File Type' };
  } else {
    return { success: false, message: 'Invalid File Type' };
    console.log('GREAT!!!');
  }
}
