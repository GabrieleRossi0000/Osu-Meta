export function parseDisplayName(
  displayName: string,
  folderName: string
): { artist: string; title: string } {
  const sep = displayName.indexOf(' - ')
  if (sep > 0) {
    return {
      artist: displayName.slice(0, sep).trim(),
      title: displayName.slice(sep + 3).trim()
    }
  }
  return {
    artist: displayName.trim() || folderName,
    title: ''
  }
}
