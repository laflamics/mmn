import { supabase } from './supabase';

export const uploadDocument = async (file, folder = 'documents') => {
  try {
    if (!file) throw new Error('No file selected');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${user.id}/${timestamp}-${file.name}`;
    const path = `${folder}/${filename}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(path);

    return {
      url: publicUrl,
      name: file.name,
      path: path
    };
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
};

export const deleteDocument = async (path) => {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Delete error:', err);
    throw err;
  }
};
