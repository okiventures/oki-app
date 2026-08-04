import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export const LOCATION_TASK_NAME = 'background-handyman-location-task';

// The RPC derives the handyman id from auth.uid() server-side (migration 010
// dropped the p_handyman_id arg), so coordinates are the whole payload.
async function upsertLocation(latitude: number, longitude: number) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { error } = await supabase.rpc('upsert_handyman_location', {
    p_lat: latitude,
    p_lng: longitude,
  });
  if (error) throw error;
  return true;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  const { latitude, longitude } = locations[locations.length - 1].coords;

  try {
    await upsertLocation(latitude, longitude);
  } catch (err) {
    console.error('Failed to stream background location update:', err);
  }
});

/**
 * One-shot write of the current position. Background permission is a separate,
 * much harder ask than foreground, and `list_available_bookings` falls back to
 * an unfiltered radius when a handyman has no row in handyman_locations — so
 * without this, declining the background prompt meant proximity dispatch never
 * applied to that account at all.
 */
export const pushCurrentLocation = async () => {
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return await upsertLocation(coords.latitude, coords.longitude);
  } catch (err) {
    console.error('Failed to write current location:', err);
    return false;
  }
};

/**
 * Returns whether continuous background tracking is running. A `false` return
 * does not mean no location was recorded: the foreground fix above is written
 * first, so a handyman who grants foreground and refuses background is still
 * placed on the map, just not updated as they move.
 */
export const startBackgroundTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;

  await pushCurrentLocation();

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') return false;

  const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isTaskRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 200,
      timeInterval: 5 * 60 * 1000,
      deferredUpdatesInterval: 5 * 60 * 1000,
      foregroundService: {
        notificationTitle: 'Platform Active',
        notificationBody: 'Streaming your location for incoming jobs.',
        notificationColor: '#000000',
      },
      pausesUpdatesAutomatically: false,
    });
  }
  return true;
};

export const stopBackgroundTracking = async () => {
  const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isTaskRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
