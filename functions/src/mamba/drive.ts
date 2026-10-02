/**
 * File a dossier PDF in the Mamba shared drive — the upload half of
 * cybrdeck-website's dossier-build.ts `fileDossier`.
 *
 * Runs as the function's service account, which must be a Content manager
 * (or Contributor) on the shared drive. Service accounts have no storage of
 * their own, so the folder has to live on a shared drive for the upload to
 * have somewhere to land.
 *
 * Simpler than cybrdeck's version: an MVP application is a new document every
 * time (no revisions), so there is never an existing file to update in place.
 */
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });

export async function fileDossier(pdf: Buffer, filename: string, folderId: string): Promise<string> {
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Drive access token unavailable');

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify({ name: filename, parents: [folderId] })], { type: 'application/json' }),
  );
  form.append('file', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) throw new Error(`Drive upload failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { id } = (await res.json()) as { id?: string };
  if (!id) throw new Error('Drive upload returned no file id');
  return id;
}
