"use client";

import { useCallback, useSyncExternalStore } from "react";

type Subscriber = () => void;

const subscribers = new Map<string, Set<Subscriber>>();

/**
 * Registers a subscriber to a localStorage key.
 * @param key The localStorage key to observe.
 * @param subscriber The callback invoked when the key changes.
 * @returns A function removing the subscriber.
 */
function subscribe(key: string, subscriber: Subscriber): () => void {
  const keySubscribers = subscribers.get(key) ?? new Set<Subscriber>();
  keySubscribers.add(subscriber);
  subscribers.set(key, keySubscribers);

  return () => {
    keySubscribers.delete(subscriber);
  };
}

function emit(key: string): void {
  subscribers.get(key)?.forEach((subscriber) => subscriber());
}

/**
 * Writes a localStorage entry and notifies its subscribers.
 * @param key The localStorage key to write.
 * @param value The value to store.
 */
export function writeStoredValue(key: string, value: string): void {
  localStorage.setItem(key, value);
  emit(key);
}

/**
 * Subscribes a component to a localStorage entry.
 * `serverValue` is returned while hydrating so that the first client render
 * matches the server output; React then re-renders with the stored value.
 * @param key The localStorage key to observe.
 * @param serverValue The value to use on the server and when nothing is stored.
 * @returns The stored value, or `serverValue`.
 */
export function useStoredValue(key: string, serverValue: string): string {
  const subscribeToKey = useCallback(
    (subscriber: Subscriber) => subscribe(key, subscriber),
    [key],
  );
  const getSnapshot = useCallback(
    () => localStorage.getItem(key) ?? serverValue,
    [key, serverValue],
  );
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribeToKey, getSnapshot, getServerSnapshot);
}
