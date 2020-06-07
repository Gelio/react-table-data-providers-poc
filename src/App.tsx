import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

import { useObservable } from './utils/use-observable';
import {
  Todo,
  mapParamsToQueryStringFactory,
  getTodosDataGetterFactory,
} from './example';
import {
  TableFetchingResult,
  TableDataGetter,
  isFetchingError,
} from './data/types';
import {
  getClientsidePaginatedDataGetter,
  TableDataWithCount,
  FilterFunction,
} from './data/clientside-paginated-data-getter';
import { interval, of, pipe } from 'rxjs';
import {
  getRefResolvingDataGetter,
  ReferencesResolver,
} from './data/ref-resolving-data-getter';
import { createTableStateProvider } from './data/state-provider';
import { isDefined } from './utils/is-defined';
import {
  composableRefResolvingDataGetter,
  composableClientsidePaginatedDataGetter,
} from './data/composable';

const serversideDataGetterWithPagination = getTodosDataGetterFactory(
  mapParamsToQueryStringFactory({ pagination: true, searching: true })
);

const serversideDataGetterWithoutPagination = getTodosDataGetterFactory(
  mapParamsToQueryStringFactory({ pagination: false, searching: false })
);

const resolveTodoReferences: ReferencesResolver<TableDataWithCount<Todo>> = (
  todosData,
  { someNumber }
) => {
  return {
    ...todosData,
    rows: todosData.rows.map((todo, index) => ({
      ...todo,
      title:
        todo.title +
        (someNumber !== null && index % 2 === 0
          ? ` --- data from ref: ${(someNumber as number) * index}`
          : ''),
    })),
  };
};

const todoReferences = {
  someNumber: interval(1000),
  todos: serversideDataGetterWithPagination(
    of({ page: 2, pageSize: 10, requestId: '123', searchPhrase: '' })
  ),
};

const todoFilter: FilterFunction<Todo> = (todo, searchPhrase) =>
  todo.title.includes(searchPhrase);

const dataGetters: Record<
  string,
  TableDataGetter<TableDataWithCount<Todo>, any>
> = {
  serverside: serversideDataGetterWithPagination,

  // NOTE: simulate that some number is needed (can be fetched from the network)
  serversideWithReferences: getRefResolvingDataGetter(
    serversideDataGetterWithPagination,
    todoReferences,
    resolveTodoReferences
  ),
  clientside: getClientsidePaginatedDataGetter(
    serversideDataGetterWithoutPagination,
    todoFilter
  ),
  // NOTE: simulate that some number is needed (can be fetched from the network)
  clientsideWithReferences: getClientsidePaginatedDataGetter(
    getRefResolvingDataGetter(
      serversideDataGetterWithoutPagination,
      todoReferences,
      resolveTodoReferences
    ),
    todoFilter
  ),

  // NOTE: experiment with composition
  composableExperiment: pipe(
    composableRefResolvingDataGetter(todoReferences, resolveTodoReferences),
    composableClientsidePaginatedDataGetter(todoFilter)
  )(serversideDataGetterWithoutPagination),
};

export default function App() {
  const [dataGetterVariant, setDataGetterVariant] = useState('serverside');
  const dataGetter = useMemo(() => dataGetters[dataGetterVariant], [
    dataGetterVariant,
  ]);
  const stateProvider = useMemo(() => createTableStateProvider(dataGetter), [
    dataGetter,
  ]);

  const [tableState, observableError] = useObservable(
    stateProvider.tableState$
  );

  const moveToPreviousPage = () => stateProvider.setPage(tableState!.page - 1);
  const moveToNextPage = () => stateProvider.setPage(tableState!.page + 1);

  return (
    <div className="App">
      <h1>Table data providers POC</h1>

      <h3>Pagination type</h3>
      <ul>
        {Object.keys(dataGetters).map((dataGetterType) => (
          <li key={dataGetterType}>
            <label>
              <input
                type="radio"
                checked={dataGetterVariant === dataGetterType}
                onChange={() => setDataGetterVariant(dataGetterType)}
              />
              {dataGetterType}
            </label>
          </li>
        ))}
      </ul>

      <div>
        Search:
        <input
          type="text"
          value={tableState?.searchPhrase}
          onChange={(e) => stateProvider.setSearchPhrase(e.target.value)}
        />
      </div>

      <button onClick={() => stateProvider.refresh()}>Refresh</button>

      <h3>Todos</h3>
      <div>
        <button onClick={moveToPreviousPage}>&lt;</button>
        {tableState?.page}
        <button onClick={moveToNextPage}>&gt;</button>
      </div>

      {observableError && (
        <div>Error providing table state: {observableError}</div>
      )}
      {renderResult(tableState?.result)}
    </div>
  );
}

function renderResult(
  result?: TableFetchingResult<TableDataWithCount<Todo>, any>
) {
  if (!isDefined(result)) {
    return <div>Loading...</div>;
  }
  if (isFetchingError(result)) {
    console.error(result.error);
    return <div>Fetching error. See the console</div>;
  }

  return <TodoList data={result.data} />;
}

function TodoList({ data }: { data: TableDataWithCount<Todo> }) {
  const { rows } = data;

  if (rows.length === 0) {
    return <div>No data matches criteria.</div>;
  }

  return (
    <ul>
      {data.rows.map((row) => (
        <li key={row.id}>{row.title}</li>
      ))}
    </ul>
  );
}
