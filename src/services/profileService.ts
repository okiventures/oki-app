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
