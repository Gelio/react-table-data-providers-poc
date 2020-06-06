import { ajax } from 'rxjs/ajax';
import { map, catchError } from 'rxjs/operators';
import { concat, of } from 'rxjs';

import { TableDataGetter, TableData, TableDataParams } from './data/types';

export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

// NOTE: could be customized to fetch various backend resources
// NOTE: can use backend pagination
export function getTodosFactory(
  mapParamsToQueryString: (params: TableDataParams) => string
): TableDataGetter<Todo> {
  return (params) => {
    const queryParams = mapParamsToQueryString(params);

    // NOTE: possible to add fetching based on parameters
    return concat(
      of({ loading: true } as TableData<Todo>),
      ajax
        .getJSON<Todo[]>(
          `https://jsonplaceholder.typicode.com/todos?${queryParams}`
        )
        .pipe(
          map(
            (todos): TableData<Todo> => ({
              rows: todos,
              loading: false,
            })
          ),
          catchError((error) =>
            of({ loading: false, error } as TableData<Todo>)
          )
        )
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
