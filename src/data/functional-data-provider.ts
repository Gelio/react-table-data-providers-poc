import { Subject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { FunctionalTableDataProviderFactory, TableDataGetter } from './types';

export const functionalTableDataProviderFactory = <RowData>(
  getData: TableDataGetter<RowData>
): FunctionalTableDataProviderFactory<RowData> => {
  const requestIdSubject = new Subject<string>();
  const refresh = () => requestIdSubject.next(uuid());

  return (params$) => {
    const tableData$ = combineLatest(params$, requestIdSubject).pipe(
      map(([params, requestId]) => getData({ ...params, requestId })),
      // NOTE: prevents unsubscribing from the previous observable and subscribing to the next one when the same
      // Observable instance was returned.
      // This should prevent canceling requests in clientside pagination, when there is only 1 request needed,
      // no matter what the parameters are.
      distinctUntilChanged(),
      switchMap((getData$) => getData$)
    );

    return {
      tableData$,
      refresh,
    };
  };
};
