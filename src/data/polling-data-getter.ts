import { TableDataGetter } from './types';
import { switchMap, startWith, tap, debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';

export const pollingDataGetter = <Data, Error>(
  getData: TableDataGetter<Data, Error>,
  /**
   * The delay between the end of the last request and the start of the next request
   */
  pollingInterval: number
): TableDataGetter<Data, Error> => (params$) => {
  const tickSubject = new Subject();
  const data$ = tickSubject.pipe(
    debounceTime(pollingInterval),
    startWith(1),
    switchMap(() => getData(params$))
  );

  return data$.pipe(
    tap((data) => {
      if (!data.loading) {
        tickSubject.next();
      }
    })
  );
};
