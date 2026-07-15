export function setDetailPath(setId: string): string {
  return `/sets/${encodeURIComponent(setId)}`;
}

export function parseSetIdFromSegments(segments: string[]): string {
  return decodeURIComponent(segments.join("/"));
}