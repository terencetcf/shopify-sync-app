export function extractFileName(url: string): string {
  try {
    // Remove query parameters
    const urlWithoutParams = url.split('?')[0];
    // Get the last part of the path
    const fileName = urlWithoutParams.split('/').pop();
    return fileName || '';
  } catch (error) {
    return '';
  }
}
