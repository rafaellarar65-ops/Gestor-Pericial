import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContextStore>();

  run(store: RequestContextStore, callback: () => void): void {
    this.als.run(store, callback);
  }

  get<K extends keyof RequestContextStore>(key: K): RequestContextStore[K] {
    return this.als.getStore()?.[key];
  }
}
