import { Observable, Subject } from 'rxjs';
import { scan } from 'rxjs/operators';

export interface UpdatableStream<T> {
  stream$: Observable<T>;
  // TODO: updater function instead of patch
  update(patch: Partial<T>): void;
}

export const getUpdatableStream = <T>(initialValue: T): UpdatableStream<T> => {
  const updatesSubject = new Subject<Partial<T>>();
  const stream$ = updatesSubject.pipe(
    scan((data, updates) => ({ ...data, ...updates }), initialValue)
    // TODO: consider adding shareReplay(1)
  );

  return {
    stream$,
    update: (patch) => updatesSubject.next(patch),
  };
};
