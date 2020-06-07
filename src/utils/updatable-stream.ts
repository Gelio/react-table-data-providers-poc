import { Observable, Subject } from 'rxjs';
import { scan, shareReplay, startWith } from 'rxjs/operators';

export type Updater<T> = (data: T) => T;

export interface UpdatableStream<T> {
  stream$: Observable<T>;
  update(patchOrUpdater: Partial<T> | Updater<T>): void;
}

export const getUpdatableStream = <T>(initialValue: T): UpdatableStream<T> => {
  const updatesSubject = new Subject<Partial<T> | Updater<T>>();
  const stream$ = updatesSubject.pipe(
    startWith({}),
    scan(
      (data, patchOrUpdater) =>
        typeof patchOrUpdater === 'function'
          ? patchOrUpdater(data)
          : { ...data, ...patchOrUpdater },
      initialValue
    ),
    shareReplay(1)
  );

  return {
    stream$,
    update: (patchOrUpdater) => updatesSubject.next(patchOrUpdater),
  };
};
