/**
 * Search Hook
 * Based on web app implementation with React Native adaptations
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { debounce } from 'lodash'
import { searchService, SearchParams, SearchResponse } from '../services/searchService'

export interface UseSearchOptions {
  radius?: number // Max 100 miles (161km) for location-based searches
  limit?: number // 1-100 results per category
  debounceMs?: number
  enabled?: boolean
}

export interface UseSearchReturn {
  results: SearchResponse | null
  isLoading: boolean
  error: string | null
  totalResults: number
  hasResults: boolean
  query: string
}

export function useSearch() {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (params: SearchParams) => {
    if (params.query.trim().length < 2) {
      setSearchParams(null)
      setResults(null)
      return
    }
    
    setSearchParams(params)
    setIsLoading(true)
    setError(null)

    try {
      const searchResults = await searchService.search(params)
      setResults(searchResults)
    } catch (err: any) {
      setError(err.message || 'Search failed')
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setSearchParams(null)
    setResults(null)
    setError(null)
  }, [])

  const refetch = useCallback(() => {
    if (searchParams) {
      search(searchParams)
    }
  }, [search, searchParams])

  const totalResults = useMemo(() => {
    if (!results) return 0
    return (
      (results.users.length || 0) +
      (results.events.length || 0) +
      (results.locations.length || 0)
    )
  }, [results])

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
    refetch,
    totalResults,
    hasResults: !!results && totalResults > 0,
    query: searchParams?.query || '',
  }
}

export function useRealtimeSearch(
  query: string,
  userLocation?: { latitude: number; longitude: number },
  options: UseSearchOptions = {},
): UseSearchReturn {
  const { radius = 100, limit = 10, debounceMs = 300, enabled = true } = options

  const { search, results, isLoading, error, totalResults, hasResults } = useSearch()

  const debouncedSearch = useMemo(
    () =>
      debounce((q: string) => {
        if (q.length >= 2) {
          search({
            query: q,
            ...(userLocation && {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }),
            radius,
            limit,
          });
        }
      }, debounceMs),
    [search, userLocation, radius, limit, debounceMs],
  )

  useEffect(() => {
    if (enabled) {
      if (query.length >= 2) {
        debouncedSearch(query)
      } else {
        debouncedSearch.cancel()
      }
    }

    return () => {
      debouncedSearch.cancel()
    }
  }, [query, enabled, debouncedSearch])

  return {
    results,
    isLoading,
    error,
    totalResults,
    hasResults,
    query,
  }
}

export function useSearchSuggestions(
  query: string,
  userLocation?: { latitude: number; longitude: number },
) {
  return useRealtimeSearch(query, userLocation, {
    limit: 5, // Fewer results for suggestions
    debounceMs: 200, // Faster response for suggestions
    radius: 50, // Smaller radius for suggestions (max 100 miles/161km)
  })
}

export function useLocationSearch(
  query: string,
  location: { latitude: number; longitude: number },
  options: UseSearchOptions = {},
): UseSearchReturn {
  const { radius = 100, limit = 10, debounceMs = 300 } = options

  return useRealtimeSearch(query, location, {
    radius,
    limit,
    debounceMs,
  })
}

export function useGlobalSearch(
  query: string,
  options: UseSearchOptions = {},
): UseSearchReturn {
  const { limit = 10, debounceMs = 300 } = options

  return useRealtimeSearch(query, undefined, {
    limit,
    debounceMs,
  })
}
