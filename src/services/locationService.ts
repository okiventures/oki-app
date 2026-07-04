import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export const LOCATION_TASK_NAME = 'background-handyman-location-task';

// 1. Define the background task runner
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    if (!locations || locations.length === 0) return;

    // Grab the latest location point from the batch array
    const latestLocation = locations[locations.length - 1];
    const { latitude, longitude } = latestLocation.coords;

    try {
      // Get current authenticated session safely from memory
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Execute high-speed RPC upsert bypassing REST reflection overhead
      const { error: rpcError } = await supabase.rpc('upsert_handyman_location', {
        p_handyman_id: session.user.id,
        p_lat: latitude,
        p_lng: longitude,
      });
      if (rpcError) throw rpcError;
    } catch (err) {
      console.error('Failed to stream background location update:', err);
    }
  }
});

// 2. Helper functions to toggle tracking cleanly based on Online/Offline state
export const startBackgroundTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') return false;

  const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isTaskRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      // Strategy: Throttle network calls. Update only if they move 200m or 5 minutes pass
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
