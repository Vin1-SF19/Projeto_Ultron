import type { DomainEvent } from '@ultron/contracts';

export type EventListener = (event: DomainEvent) => void;

export interface EventSubscription {
  /** Filtra por tipo exato (ex: "system.started") ou prefixo com "*" (ex: "system.*"). */
  pattern?: string;
  listener: EventListener;
}

export type EventBusErrorHandler = (error: unknown, event: DomainEvent) => void;

function matchesPattern(type: string, pattern?: string): boolean {
  if (!pattern || pattern === '*') return true;
  if (pattern.endsWith('.*')) return type.startsWith(pattern.slice(0, -1));
  return type === pattern;
}

/**
 * Event Bus in-process: pub/sub puro, sem persistência. A persistência é
 * responsabilidade de quem publica (ex: EventStore no control-plane), que
 * primeiro grava e só então publica no bus — garantindo que nenhum assinante
 * veja um evento que não sobreviveria a um reinício.
 */
export class EventBus {
  private readonly subscriptions = new Set<EventSubscription>();

  constructor(private readonly onListenerError?: EventBusErrorHandler) {}

  publish(event: DomainEvent): void {
    for (const subscription of this.subscriptions) {
      if (!matchesPattern(event.type, subscription.pattern)) continue;

      try {
        subscription.listener(event);
      } catch (error) {
        // Um assinante com falha nunca deve impedir os demais de receber o evento,
        // nem derrubar quem publicou. O erro é reportado, nunca engolido.
        if (this.onListenerError) {
          this.onListenerError(error, event);
        } else {
          throw error;
        }
      }
    }
  }

  subscribe(listener: EventListener, pattern?: string): () => void {
    const subscription: EventSubscription = { pattern, listener };
    this.subscriptions.add(subscription);
    return () => this.subscriptions.delete(subscription);
  }

  get subscriberCount(): number {
    return this.subscriptions.size;
  }
}
