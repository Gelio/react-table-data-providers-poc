import { Observable } from 'rxjs';

export interface FetchingSuccess<Data> {
  type: 'success';
  data: Data;
}

export interface FetchingError<Error> {
  type: 'error';
  error: Error;
}

export function isFetchingSuccess<Data, Error>(
  fetchingResult: TableFetchingResult<Data, Error>
): fetchingResult is FetchingSuccess<Data> {
  return fetchingResult.type === 'success';
}
export function isFetchingError<Data, Error>(
  fetchingResult: TableFetchingResult<Data, Error>
): fetchingResult is FetchingError<Error> {
  return fetchingResult.type === 'error';
}

export type TableFetchingResult<Data, Error> =
  | FetchingSuccess<Data>
  | FetchingError<Error>;

export interface DataFetchingState<Data, Error> {
  loading: boolean;
  result?: TableFetchingResult<Data, Error>;
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
