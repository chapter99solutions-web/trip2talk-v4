import { supabase } from './supabase';

export type GoogleDriveCreateFolderRequest = {
  name: string;
  parentId?: string;
};

export async function createGoogleDriveFolder(input: GoogleDriveCreateFolderRequest): Promise<{
  success: boolean;
  folderId?: string;
  folderUrl?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('google-workspace-sync', {
    body: { action: 'CREATE_FOLDER', payload: input },
  });

  if (error) return { success: false, error: error.message };
  if (data && typeof data === 'object' && 'success' in data && !(data as any).success) {
    return { success: false, error: (data as any).error ?? 'Google Drive folder create failed' };
  }
  return {
    success: true,
    folderId: (data as any)?.folderId,
    folderUrl: (data as any)?.folderUrl,
  };
}

