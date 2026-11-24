import { SourceEvidence } from '../interfaces/evidence.types';

export const SEARCH_PROVIDER_TOKEN = Symbol('ISearchProviderAdapter');

export interface ISearchProviderAdapter {
  search(query: string, maxResults: number): Promise<SourceEvidence[]>;
}
