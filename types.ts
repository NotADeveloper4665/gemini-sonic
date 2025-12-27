
export interface SearchResult {
  title: string;
  uri: string;
  snippet?: string;
}

export interface SearchResponse {
  summary: string;
  sources: SearchResult[];
  actualQuery: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  TWEAKING = 'TWEAKING',
  ANALYZING = 'ANALYZING',
  SEARCHING = 'SEARCHING',
  SYNTHESIZING = 'SYNTHESIZING',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}
