import { ajax } from 'rxjs/ajax';
import { map, catchError, switchMap } from 'rxjs/operators';
import { concat, of } from 'rxjs';

import {
  TableDataGetter,
  DataFetchingState,
  TableDataParams,
} from './data/types';
import { TableDataWithCount } from './data/clientside-paginated-data-getter';

export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

// NOTE: could be customized to fetch various backend resources
// NOTE: can use backend pagination
export function getTodosDataGetterFactory(
  mapParamsToQueryString: (params: TableDataParams) => string
): TableDataGetter<TableDataWithCount<Todo>, any> {
  return (params$) => {
    const queryParams$ = params$.pipe(map(mapParamsToQueryString));

    return queryParams$.pipe(
      switchMap((queryParams) => {
        return concat(
          of({ loading: true } as DataFetchingState<
            TableDataWithCount<Todo>,
            any
          >),
          ajax
            .getJSON<Todo[]>(
              `https://jsonplaceholder.typicode.com/todos?${queryParams}`
            )
            .pipe(
              map(
                (todos): DataFetchingState<TableDataWithCount<Todo>, any> => ({
                  loading: false,
                  result: {
                    type: 'success',
                    data: {
                      rows: todos,
                      // TODO: extract totalCount from response
                      totalCount: todos.length,
                    },
                  },
                })
              ),
              catchError((error) =>
                of<DataFetchingState<TableDataWithCount<Todo>, any>>({
                  loading: false,
                  result: {
                    type: 'error',
                    error,
                  },
                })
              )
            )
        );
      })
    );
  };
}

export const mapParamsToQueryStringFactory = ({
  pagination,
  searching,
}: {
  pagination: boolean;
  searching: boolean;
}) => ({ searchPhrase, page, pageSize }: TableDataParams) => {
  return [
    searching && searchPhrase && `title_like=${searchPhrase}`,
    pagination && `_page=${page}&_limit=${pageSize}`,
  ]
    .filter(Boolean)
    .join('&');
};
