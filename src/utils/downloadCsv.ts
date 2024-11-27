interface DownloadCsvOptions {
  filename: string;
  data: string;
  prefix?: string;
  timestamp?: boolean;
}

export const downloadCsv = ({
  filename,
  data,
  prefix = '',
  timestamp = true,
}: DownloadCsvOptions) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);

  const date = timestamp ? `-${new Date().toISOString().split('T')[0]}` : '';
  const prefixStr = prefix ? `${prefix}-` : '';
  link.setAttribute('download', `${prefixStr}${filename}${date}.csv`);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up the URL object
};
