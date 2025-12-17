import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Normalize address for consistent caching (lowercase, trim, remove extra spaces)
function normalizeAddress(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function useDistanceCache() {
  const { user } = useAuth();

  // Get cached distance if it exists
  const getCachedDistance = async (
    startAddress: string,
    endAddress: string
  ): Promise<number | null> => {
    if (!user) return null;

    const normalizedStart = normalizeAddress(startAddress);
    const normalizedEnd = normalizeAddress(endAddress);

    try {
      const { data, error } = await supabase
        .from('distance_cache')
        .select('distance')
        .eq('user_id', user.id)
        .eq('start_address', normalizedStart)
        .eq('end_address', normalizedEnd)
        .maybeSingle();

      if (error) {
        console.error('Error fetching cached distance:', error);
        return null;
      }

      return data?.distance ?? null;
    } catch (error) {
      console.error('Error in getCachedDistance:', error);
      return null;
    }
  };

  // Save distance to cache
  const cacheDistance = async (
    startAddress: string,
    endAddress: string,
    distance: number
  ): Promise<void> => {
    if (!user) return;

    const normalizedStart = normalizeAddress(startAddress);
    const normalizedEnd = normalizeAddress(endAddress);

    try {
      // Use upsert to avoid duplicates
      await supabase
        .from('distance_cache')
        .upsert(
          {
            user_id: user.id,
            start_address: normalizedStart,
            end_address: normalizedEnd,
            distance,
          },
          {
            onConflict: 'user_id,start_address,end_address',
            ignoreDuplicates: true,
          }
        );
    } catch (error) {
      console.error('Error caching distance:', error);
    }
  };

  // Get distance with caching - checks cache first, then calls API
  const getDistanceWithCache = async (
    startAddress: string,
    endAddress: string,
    fetchDistanceFn: () => Promise<number | null>
  ): Promise<number | null> => {
    // First check cache
    const cachedDistance = await getCachedDistance(startAddress, endAddress);
    if (cachedDistance !== null) {
      console.log('Using cached distance:', cachedDistance);
      return cachedDistance;
    }

    // If not in cache, fetch from API
    const distance = await fetchDistanceFn();
    
    // Cache the result if we got a valid distance
    if (distance !== null) {
      await cacheDistance(startAddress, endAddress, distance);
    }

    return distance;
  };

  return {
    getCachedDistance,
    cacheDistance,
    getDistanceWithCache,
  };
}
