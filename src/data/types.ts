import { Observable } from 'rxjs';

export type TableData<Data, Error> =
  | { type: 'success'; data: Data }
  | { type: 'error'; error: Error };

export interface DataFetchingState<Data, Error> {
  loading: boolean;
  data: TableData<Data, Error>;
}

export type DataFetchingState$<Data, Error> = Observable<
  DataFetchingState<Data, Error>
>;

/**
 * Parameters for backend requests
 *
 * Can be used to simulate client-side pagination
 */
export interface TableDataParams {
  pageSize: number;
  page: number;
  searchPhrase: string;

  // NOTE: used to trigger refetches. If requestId changed, force sending the request again
  requestId: string;

  // TODO: add sorting rules
  // TODO: add filter criteria
}

export type TableDataGetter<Data, Error> = (
  params$: Observable<TableDataParams>
) => DataFetchingState$<Data, Error>;

// ---------------------------------------

export interface TableDataProvider<RowData> {
  setPageSize(pageSize: number): void;
  setPage(page: number): void;
  setSearchPhrase(searchPhrase: string): void;
  refresh(): void;

  tableData$: DataFetchingState$<RowData>;
}

// ---------------------------------------

export interface FunctionalTableDataProvider<RowData> {
  refresh(): void;

  tableData$: DataFetchingState$<RowData>;
}

export type FunctionalTableDataProviderFactory<RowData> = (
  params$: Observable<TableDataParams>
) => FunctionalTableDataProvider<RowData>;
