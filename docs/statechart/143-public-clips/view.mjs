export const title = 'Completed clip links are public';
export function state(v) {
  if (v.phase !== 'Ready' || v.reply === 'None') return v.phase;
  if (v.reply === '404') return 'Read denied';
  return v.kind === 'Clip' ? 'Clip link opened' : 'Private owner read';
}
export function step(action, from, to) {
  const labels = {
    BeginUpload: 'signed-in owner starts upload',
    DenyUpload: 'anonymous upload is denied',
    ObjectUploaded: 'private object finishes uploading',
    Publish: 'validated metadata publishes artifact',
    Fail: 'upload or metadata validation fails',
    LoseObject: 'published object becomes unavailable',
  };
  if (action === 'Read' && from.phase === 'Ready') {
    if (to.reply === '404') return 'missing ID or private file is denied';
    return to.kind === 'Clip' ? 'anyone opens completed clip URL' : 'owner opens private file';
  }
  return labels[action] ?? null;
}
