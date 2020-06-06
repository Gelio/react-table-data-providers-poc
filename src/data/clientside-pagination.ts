import { always, identity } from 'ramda';
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
  filterData: (row: RowData, searchPhrase: string) => boolean = always(true),
  // TODO: handle `sortingRules` as a 2nd parameter
  sortData: (rows: RowData[]) => RowData[] = identity
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
  const filteredTableRows$ = getFilteredTableRows(
    params$,
    allTableData$,
    filterData
  );

  const sortedTableRows$ = filteredTableRows$.pipe(map(sortData));
  const currentPageRows$ = getCurrentPageRows(params$, sortedTableRows$);

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

function getCurrentPageRows<RowData>(
  params$: Observable<TableDataParams>,
  tableRows$: Observable<RowData[]>
) {
  const page$ = params$.pipe(pluck('page'), distinctUntilChanged());
  const pageSize$ = params$.pipe(pluck('pageSize'), distinctUntilChanged());

  return combineLatest(tableRows$, page$, pageSize$).pipe(
    map(([rows, page, pageSize]) => {
      const pageStartIndex = (page - 1) * pageSize;
      const pageEndIndex = pageStartIndex + pageSize;

      return rows.slice(pageStartIndex, pageEndIndex);
    })
  );
}

function getFilteredTableRows<RowData>(
  params$: Observable<TableDataParams>,
  allTableData$: Observable<TableData<RowData>>,
  filterData: (row: RowData, searchPhrase: string) => boolean
) {
  const allRows$ = allTableData$.pipe(
    pluck('rows'),
    filter((rows) => Array.isArray(rows))
  ) as Observable<RowData[]>;
  const searchPhrase$ = params$.pipe(
    pluck('searchPhrase'),
    distinctUntilChanged()
  );

  return combineLatest(allRows$, searchPhrase$).pipe(
    map(([rows, searchPhrase]) =>
      rows.filter((row) => filterData(row, searchPhrase))
    )
  );
}
