export const title = 'Private files on a public Site';
export function state(v) { return v.phase; }
export function step(action, from, to) {
  const labels = {
    Allocate: 'first write allocates user folder',
    BeginUpload: 'clip download starts',
    ObjectUploaded: 'private upload finishes',
    Publish: 'validated metadata is saved',
    Fail: 'transfer or metadata validation fails',
    ExplicitLocal: 'local runtime writes local file',
  };
  return labels[action] ?? null;
}
