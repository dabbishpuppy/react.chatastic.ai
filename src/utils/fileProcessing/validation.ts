
export const getSupportedFileTypes = () => ['.pdf', '.doc', '.docx', '.txt'];

export const validateFileType = (file: File): boolean => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return getSupportedFileTypes().includes(extension);
};

export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};
