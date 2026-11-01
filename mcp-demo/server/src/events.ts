/**
 * Tells open pages that a user's library changed, so they refetch it. This is
 * what makes the page update live while Claude works on stage.
 *
 * In memory, one process: right for a single Railway instance. The message
 * carries no data, only "something changed" plus what to highlight, so a
 * missed message costs nothing that the next refetch does not repair.
 */
export interface LibraryChange {
  /** Ids of playlists or videos just added, for the page to highlight. */
  highlight: string[];
}

type Listener = (change: LibraryChange) => void;

export class ChangeHub {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(userId: string, listener: Listener): () => void {
    let set = this.listeners.get(userId);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(userId, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(userId);
    };
  }

  publish(userId: string, change: LibraryChange): void {
    for (const listener of this.listeners.get(userId) ?? []) listener(change);
  }
}
