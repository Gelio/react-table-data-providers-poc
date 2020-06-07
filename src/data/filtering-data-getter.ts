import {
  FilterFunction,
  TableDataWithCount,
  Entity,
} from './clientside-paginated-data-getter';
import {
  TableDataGetter,
  TableDataParams,
  DataFetchingState,
  isFetchingSuccess,
  isFetchingError,
} from './types';
import {
  filter,
  pluck,
  map,
  distinctUntilChanged,
  share,
} from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';
import { isDefined } from '../utils/is-defined';

export const composableFilteringDataGetter = <RowData extends Entity>(
  filterData: FilterFunction<RowData>
) => <Error>(
  getData: TableDataGetter<TableDataWithCount<RowData>, Error>
): TableDataGetter<TableDataWithCount<RowData>, Error> => (params$) => {
  const dataFetchingState$ = getData(params$).pipe(share());
  const filteredTableRows$ = getFilteredTableRows(
    params$,
    dataFetchingState$,
    filterData
  );

  return combineLatest(dataFetchingState$, filteredTableRows$).pipe(
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
};

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
