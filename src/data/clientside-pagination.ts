import { always } from 'ramda';
import { combineLatest, BehaviorSubject, Observable } from 'rxjs';
import {
  distinctUntilKeyChanged,
  switchMap,
  pluck,
  filter,
  distinctUntilChanged,
  map,
  share,
} from 'rxjs/operators';

import { TableDataGetter, TableDataParams, TableData } from './types';

// TODO: how to swap the filter function without creating a new DataGetter?

export const getClientsidePaginatedDataFactory = <RowData>(
  getData: TableDataGetter<RowData>,
  // NOTE: used for filtering, searching, etc.
  filterData: (row: RowData, searchPhrase: string) => boolean = always(true)
): TableDataGetter<RowData> => {
  const paramsSubject = new BehaviorSubject<TableDataParams | null>(null);
  const params$ = paramsSubject.pipe(filter((x) => !!x)) as Observable<
    TableDataParams
  >;
  const allTableData$ = params$.pipe(
    distinctUntilKeyChanged('requestId'),
    switchMap(getData),
    share()
  );
  const searchPhrase$ = params$.pipe(
    pluck('searchPhrase'),
    distinctUntilChanged()
  );
  const filteredTableRows$ = combineLatest(
    allTableData$.pipe(
      pluck('rows'),
      filter((rows) => Array.isArray(rows))
    ),
    searchPhrase$
  ).pipe(
    map(([rows, searchPhrase]) =>
      // NOTE: filtered that rows are an array before
      rows!.filter((row) => filterData(row, searchPhrase))
    )
  );

  // TODO: searching based on filteredTableRows$

  const page$ = params$.pipe(pluck('page'), distinctUntilChanged());
  const pageSize$ = params$.pipe(pluck('pageSize'), distinctUntilChanged());
  const currentPageRows$ = combineLatest(
    filteredTableRows$,
    page$,
    pageSize$
  ).pipe(
    map(([rows, page, pageSize]) => {
      const pageStartIndex = (page - 1) * pageSize;
      const pageEndIndex = pageStartIndex + pageSize;

      return rows.slice(pageStartIndex, pageEndIndex);
    })
  );

  const currentPageTableData$ = combineLatest(
    allTableData$,
    currentPageRows$
  ).pipe(
    map(
      ([tableData, currentPageRows]): TableData<RowData> => {
        if (!Array.isArray(tableData.rows)) {
          return tableData;
        }

        return {
          ...tableData,
          rows: currentPageRows,
        };
      }
    )
  );

  return (params) => {
    paramsSubject.next(params);

    return currentPageTableData$;
  };
};
