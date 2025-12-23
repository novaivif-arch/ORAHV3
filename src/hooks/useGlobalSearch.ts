import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  redirectUrl: string;
  priorityScore: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  categories: Record<string, SearchResult[]>;
  totalCount: number;
  query: string;
  intents: string[];
}

interface UseGlobalSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300, minQueryLength = 2, limit = 10 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<Record<string, SearchResult[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecentSearches = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('recent_searches')
        .select('query')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentSearches(data.map(item => item.query));
      }
    } catch (err) {
      console.error('Error fetching recent searches:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecentSearches();
  }, [fetchRecentSearches]);

  const search = useCallback(async (searchQuery: string, filters: string[] = []) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setCategories({});
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/global-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ query: searchQuery, filters, limit }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setCategories(data.categories);
      fetchRecentSearches();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setCategories({});
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength, limit, fetchRecentSearches]);

  const debouncedSearch = useCallback((searchQuery: string, filters?: string[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setCategories({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      search(searchQuery, filters);
    }, debounceMs);
  }, [search, debounceMs, minQueryLength]);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setCategories({});
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const trackClick = useCallback(async (result: SearchResult) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      await supabase.from('search_analytics').insert({
        user_id: session.user.id,
        company_id: profile?.company_id,
        query,
        result_type: result.type,
        result_id: result.id,
        results_count: results.length,
      });
    } catch (err) {
      console.error('Error tracking click:', err);
    }
  }, [query, results.length]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    results,
    categories,
    isLoading,
    error,
    recentSearches,
    clearSearch,
    trackClick,
    search,
  };
}
