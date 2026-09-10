/** 极简 external store 工厂：theme/tabs/search 共用的订阅骨架 */
export function createStore<T>(initial: T) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => snapshot,
    set(next: T) {
      snapshot = next;
      for (const l of listeners) l();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Store<T> = ReturnType<typeof createStore<T>>;
