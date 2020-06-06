import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

import { useObservable } from './utils/use-observable';
import {
  Todo,
  getTodosFactory,
  mapParamsToQueryStringFactory,
} from './example';
import { TableData, TableDataGetter } from './data/types';
import { getClientsidePaginatedDataFactory } from './data/clientside-pagination';
import { FunctionalTableStateProvider } from './state/functional-state-provider';
import { functionalTableDataProviderFactory } from './data/functional-data-provider';
import { getRefResolvingDataFactory } from './data/ref-resolving-data-factory';
import { interval } from 'rxjs';

const dataGetters: Record<string, TableDataGetter<Todo>> = {
  serverside: getTodosFactory(
    mapParamsToQueryStringFactory({ pagination: true, searching: true })
  ),
  // NOTE: simulate that some number is needed (can be fetched from the network)
  serversideWithReferences: getRefResolvingDataFactory(
    getTodosFactory(
      mapParamsToQueryStringFactory({ pagination: true, searching: false })
    ),
    {
      someNumber: interval(1000),
      todos: getTodosFactory(
        mapParamsToQueryStringFactory({ pagination: true, searching: true })
      )({ page: 2, pageSize: 10, requestId: '123', searchPhrase: '' }),
    },
    (todos, { someNumber }) => {
      return todos.map((todo, index) => ({
        ...todo,
        title:
          todo.title +
          (someNumber !== null && index % 2 === 0
            ? ` --- data from ref: ${(someNumber as number) * index}`
            : ''),
      }));
    }
  ),
  clientside: getClientsidePaginatedDataFactory(
    getTodosFactory(
      mapParamsToQueryStringFactory({ pagination: false, searching: false })
    ),
    (todo, searchPhrase) => todo.title.includes(searchPhrase)
  ),
  // NOTE: simulate that when resolving references,
  clientsideWithReferences: getClientsidePaginatedDataFactory(
    getRefResolvingDataFactory(
      getTodosFactory(
        mapParamsToQueryStringFactory({ pagination: false, searching: false })
      ),
      {
        someNumber: interval(1000),
      },
      (todos, { someNumber }) => {
        return todos.map((todo, index) => ({
          ...todo,
          title:
            todo.title +
            (someNumber !== null && index % 2 === 0
              ? ` --- data from ref: ${(someNumber as number) * index}`
              : ''),
        }));
      }
    ),
    (todo, searchPhrase) => todo.title.includes(searchPhrase)
  ),
};

export default function App() {
  const [dataGetterVariant, setDataGetterVariant] = useState('serverside');
  const dataGetter = useMemo(() => dataGetters[dataGetterVariant], [
    dataGetterVariant,
  ]);
  const dataProviderFactory = useMemo(
    () => functionalTableDataProviderFactory(dataGetter),
    [dataGetter]
  );
  const stateProvider = useMemo(
    () => new FunctionalTableStateProvider(dataProviderFactory),
    [dataProviderFactory]
  );

  const [tableState, error] = useObservable(stateProvider.tableStateWithData$);

  useEffect(() => {
    // NOTE: initial fetch
    stateProvider.refresh();
  }, [stateProvider]);

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

      {error && <div>Error providing table state: {error}</div>}
      {tableState?.data && <TodoList data={tableState!.data} />}
    </div>
  );
}

interface TodoListProps {
  data: TableData<Todo>;
}

function TodoList({ data }: TodoListProps) {
  if (data.loading) {
    return <div>Loading...</div>;
  }

  if (data.error) {
    return <div>Error: {data.error.message}</div>;
  }

  return (
    <ul>
      {data.rows?.map((row) => (
        <li key={row.id}>{row.title}</li>
      ))}
    </ul>
  );
}
