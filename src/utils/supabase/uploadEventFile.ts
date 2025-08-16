import { supabaseClient } from './client';

export async function uploadEventFile(file: File, eventId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${eventId}/${fileName}`;

  const { data, error } = await supabaseClient.storage
    .from('event_files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Return the full public URL
  const { data: publicUrlData } = supabaseClient
    .storage
    .from('event_files')
    .getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: publicUrlData.publicUrl,
  };
}
