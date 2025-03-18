export class Event<T> {
  constructor(readonly name: string) {}

  private listenerSet = new Set<(event: T) => void>();

  on(listener: (event: T) => void): () => void {
    this.listenerSet.add(listener);

    return () => this.off(listener);
  }

  off(listener: (event: T) => void): void {
    this.listenerSet.delete(listener);
  }

  emit(event: T): void {
    for (const listener of this.listenerSet) {
      listener(event);
    }
  }
}
