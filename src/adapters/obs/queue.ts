let tail: Promise<unknown> = Promise.resolve();
export function serialize<T>(action: () => Promise<T>): Promise<T> {
  const run = tail.catch(() => {}).then(action);
  tail = run;
  return run;
}
