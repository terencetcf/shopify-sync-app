import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { error } from '@tauri-apps/plugin-log';

interface DownloadCsvOptions {
  filename: string;
  data: string;
  prefix?: string;
  timestamp?: boolean;
}

const getCsvFilename = (
  filename: string,
  prefix?: string,
  timestamp?: boolean
) => {
  const date = timestamp ? `-${new Date().toISOString().split('T')[0]}` : '';
  const prefixStr = prefix ? `${prefix}-` : '';
  return `${prefixStr}${filename}${date}.csv`;
};

export const downloadCsv = async ({
  filename,
  data,
  prefix = '',
  timestamp = true,
}: DownloadCsvOptions) => {
  const csvFilename = getCsvFilename(filename, prefix, timestamp);
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });

  if ((window as any)?.isTauri) {
    try {
      await writeTextFile(csvFilename, data, {
        baseDir: BaseDirectory.Download,
        append: true,
      });
    } catch (err) {
      error(`Error while writing file: ${JSON.stringify(err)}`);
    }

    return;
  }

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', csvFilename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up the URL object
};
