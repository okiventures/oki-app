import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfileRow {
  id: string;
  user_type: 'client' | 'handyman' | 'admin';
  user_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  full_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export interface HandymanProfileRow {
  id: string;
  bio: string | null;
  hourly_rate: number;
  years_experience: number;
  location: unknown; // PostGIS GEOGRAPHY — not parsed on client
  is_online: boolean;
  kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';
  membership_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  trust_score: number | null;
  review_count: number;
  jobs_completed: number;
  wallet_balance: number;
  certifications: string[] | null;
  response_time_avg: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user: UserProfileRow;
  handyman: HandymanProfileRow | null;
}

export interface UpdateUserProfileInput {
  full_name?: string;
  phone?: string | null;
  photo_url?: string | null;
}

export interface UpdateHandymanProfileInput {
  bio?: string | null;
  hourly_rate?: number;
  years_experience?: number;
}

// ─── Fetch Profile ────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile> {
  // Fetch user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) throw new Error(`Failed to fetch user profile: ${userError.message}`);
  if (!user) throw new Error('User profile not found');

  // Fetch handyman record if applicable
  let handyman: HandymanProfileRow | null = null;
  if (user.user_type === 'handyman') {
    const { data: h, error: hError } = await supabase
      .from('handymen')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (hError) {
      console.warn('Failed to fetch handyman profile:', hError.message);
    } else {
      handyman = h as HandymanProfileRow | null;
    }
  }

  return { user: user as UserProfileRow, handyman };
}

// ─── Update User Profile ──────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data as UserProfileRow;
}

// ─── Update Handyman Profile ──────────────────────────────────────────────────

export async function updateHandymanProfile(
  handymanId: string,
  input: UpdateHandymanProfileInput
): Promise<HandymanProfileRow> {
  const { data, error } = await supabase
    .from('handymen')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', handymanId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update handyman profile: ${error.message}`);
  return data as HandymanProfileRow;
}

// ─── Online/Offline Status ────────────────────────────────────────────────────

export interface HandymanStatus {
  id: string;
  is_online: boolean;
  last_seen_at: string | null;
}

export async function updateOnlineStatus(isOnline: boolean): Promise<HandymanStatus> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { id: '', is_online: isOnline, last_seen_at: null };
  }

  const { data, error } = await supabase.functions.invoke('handyman-status', {
    body: { isOnline },
  });

  if (error) throw new Error(`Failed to update online status: ${error.message}`);
  return (data?.data ?? data) as HandymanStatus;
}

export async function getOnlineStatus(handymanId: string): Promise<boolean | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await supabase
    .from('handymen')
    .select('is_online')
    .eq('id', handymanId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch online status: ${error.message}`);
  return data ? (data.is_online as boolean) : null;
}

// ─── Handyman Services (categories & pricing) ─────────────────────────────────

export interface ServiceCatalogItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  base_rate: number;
}

export interface HandymanServiceRow {
  handyman_id: string;
  service_id: string;
  price_override: number | null;
  created_at: string;
  service: ServiceCatalogItem;
}

const HANDYMAN_SERVICE_SELECT =
  'handyman_id, service_id, price_override, created_at, service:services(id, slug, name, category, base_rate)';

export async function listServiceCatalog(): Promise<ServiceCatalogItem[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, slug, name, category, base_rate')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) throw new Error(`Failed to fetch service catalog: ${error.message}`);
  return (data ?? []) as ServiceCatalogItem[];
}

export async function listHandymanServices(handymanId: string): Promise<HandymanServiceRow[]> {
  const { data, error } = await supabase
    .from('handyman_services')
    .select(HANDYMAN_SERVICE_SELECT)
    .eq('handyman_id', handymanId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch handyman services: ${error.message}`);
  return (data ?? []) as unknown as HandymanServiceRow[];
}

export async function addHandymanService(
  handymanId: string,
  serviceId: string,
  priceOverride?: number | null
): Promise<HandymanServiceRow> {
  const { data, error } = await supabase
    .from('handyman_services')
    .insert({
      handyman_id: handymanId,
      service_id: serviceId,
      price_override: priceOverride ?? null,
    })
    .select(HANDYMAN_SERVICE_SELECT)
    .single();

  if (error) throw new Error(`Failed to add service: ${error.message}`);
  return data as unknown as HandymanServiceRow;
}

export async function updateServicePrice(
  handymanId: string,
  serviceId: string,
  priceOverride: number | null
): Promise<HandymanServiceRow> {
  const { data, error } = await supabase
    .from('handyman_services')
    .update({ price_override: priceOverride })
    .eq('handyman_id', handymanId)
    .eq('service_id', serviceId)
    .select(HANDYMAN_SERVICE_SELECT)
    .single();

  if (error) throw new Error(`Failed to update service price: ${error.message}`);
  return data as unknown as HandymanServiceRow;
}

export async function removeHandymanService(handymanId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('handyman_services')
    .delete()
    .eq('handyman_id', handymanId)
    .eq('service_id', serviceId);

  if (error) throw new Error(`Failed to remove service: ${error.message}`);
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────────

const AVATAR_BUCKET = 'avatars';

/**
 * Pick an image from the device gallery or camera, upload to Supabase Storage,
 * and return the public URL.
 */
export async function pickAndUploadAvatar(
  userId: string,
  source: 'gallery' | 'camera' = 'gallery'
): Promise<string> {
  // Request permission
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required to take a photo');
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Gallery permission is required to select a photo');
    }
  }

  // Launch picker
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Image selection was cancelled');
  }

  const asset = result.assets[0];
  const filePath = `${userId}/avatar-${Date.now()}.${asset.uri.split('.').pop() ?? 'jpg'}`;

  // Read file as base64 (reliable on native — fetch(uri).blob() is not)
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 to Uint8Array (ArrayBufferView) for Supabase upload
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, bytes, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Get public URL
  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  // Update user profile with new photo URL
  await updateUserProfile(userId, { photo_url: urlData.publicUrl });

  return urlData.publicUrl;
}
