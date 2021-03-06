import { always, identity } from 'ramda';
import { combineLatest, Observable } from 'rxjs';
import {
  distinctUntilKeyChanged,
  pluck,
  filter,
  distinctUntilChanged,
  map,
  share,
} from 'rxjs/operators';

import {
  TableDataGetter,
  DataFetchingState,
  isFetchingSuccess,
  TableDataParams,
  isFetchingError,
} from './types';
import { isDefined } from '../utils/is-defined';

export interface Entity {
  id: number;
}

export interface TableDataWithCount<RowData extends Entity> {
  rows: RowData[];
  totalCount: number;
}

/**
 * TODO: Split single getClientsidePaginatedDataGetter to 3 data getters:
 * 1. One for paginating the results
 * 2. One for filtering the results
 * 3. One for sorting the results
 *
 * Then, the getClientsidePaginatedDataGetter could be composed of them.
 *
 * Also, they could be composed in other interesting ways and enable the following workflows:
 * 1. Filter before resolving refs
 * 2. Filter (based on main entity data) -> resolve refs -> filter based on refs
 *    More performant than always filtering results after resolving refs.
 * 3. (skip filtering) Resolve refs -> sort
 * 4. Sort based on main entity data -> resolve refs
 *    More performant than always sorting results after resolving refs.
 *
 *
 * TODO: consider augmenting the type of `params$` when applying `getData` decorators
 * E.g. when using client-side pagination or server-side pagination, add `pageSize` and `page`
 * If not using any of the above, do not add those properties.
 */

// NOTE: used for filtering, searching, etc.
export type FilterFunction<RowData> = (
  row: RowData,
  searchPhrase: string
) => boolean;
// TODO: handle `sortingRules` as a 2nd parameter
export type SortingFunction<RowData> = (rows: RowData[]) => RowData[];

// TODO: how to swap the filter function without creating a new DataGetter?

export const getClientsidePaginatedDataGetter = <RowData extends Entity, Error>(
  getData: TableDataGetter<TableDataWithCount<RowData>, Error>,
  filterData: FilterFunction<RowData> = always(true),
  sortData: SortingFunction<RowData> = identity
): TableDataGetter<TableDataWithCount<RowData>, Error> => (params$) => {
  const paramsWithUniqueRequestId$ = params$.pipe(
    distinctUntilKeyChanged('requestId')
  );
  const dataFetchingState$ = getData(paramsWithUniqueRequestId$).pipe(share());
  const filteredTableRows$ = getFilteredTableRows(
    params$,
    dataFetchingState$,
    filterData
  );

  const sortedTableRows$ = filteredTableRows$.pipe(map(sortData));
  const currentPageRows$ = getCurrentPageRows(params$, sortedTableRows$);

  const currentPageDataFetchingState$ = combineLatest(
    dataFetchingState$,
    currentPageRows$
  ).pipe(
    map(
      ([dataFetchingState, currentPageRows]): DataFetchingState<
        TableDataWithCount<RowData>,
        Error
      > => {
        if (
          !isDefined(dataFetchingState.result) ||
          isFetchingError(dataFetchingState.result)
        ) {
          return dataFetchingState;
        }

        return {
          ...dataFetchingState,
          result: {
            ...dataFetchingState.result,
            data: {
              ...dataFetchingState.result.data,
              rows: currentPageRows,
            },
          },
        };
      }
    )
  );

  return currentPageDataFetchingState$;
};

function getCurrentPageRows<RowData>(
  params$: Observable<TableDataParams>,
  rows$: Observable<RowData[]>
) {
  const page$ = params$.pipe(pluck('page'), distinctUntilChanged());
  const pageSize$ = params$.pipe(pluck('pageSize'), distinctUntilChanged());

  return combineLatest(rows$, page$, pageSize$).pipe(
    map(([rows, page, pageSize]) => {
      const pageStartIndex = (page - 1) * pageSize;
      const pageEndIndex = pageStartIndex + pageSize;

      return rows.slice(pageStartIndex, pageEndIndex);
    })
  );
}

function getFilteredTableRows<RowData extends Entity, Error>(
  params$: Observable<TableDataParams>,
  dataFetchingState$: Observable<
    DataFetchingState<TableDataWithCount<RowData>, Error>
  >,
  filterData: FilterFunction<RowData>
) {
  const rows$ = dataFetchingState$.pipe(
    pluck('result'),
    filter(isDefined),
    filter(isFetchingSuccess),
    map((fetchingSuccess) => fetchingSuccess.data.rows)
  );
  const searchPhrase$ = params$.pipe(
    pluck('searchPhrase'),
    distinctUntilChanged()
  );

  return combineLatest(rows$, searchPhrase$).pipe(
    map(([rows, searchPhrase]) =>
      rows.filter((row) => filterData(row, searchPhrase))
    )
  );
}
