import { Observable } from 'rxjs';

export type TableFetchingResult<Data, Error> =
  | { type: 'success'; data: Data }
  | { type: 'error'; error: Error };

export interface DataFetchingState<Data, Error> {
  loading: boolean;
  result: TableFetchingResult<Data, Error>;
}

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
) => Observable<DataFetchingState<Data, Error>>;
