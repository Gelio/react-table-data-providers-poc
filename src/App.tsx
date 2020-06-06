import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

import { TableStateProvider } from './state/state-provider';
import { BaseDataProvider } from './data/base-data-provider';
import { useObservable } from './utils/use-observable';
import {
  Todo,
  getTodosFactory,
  mapParamsToQueryStringFactory,
} from './example';
import { TableData, TableDataGetter } from './data/types';
import { getClientsidePaginatedDataFactory } from './data/clientside-pagination';

const dataGetters: Record<string, TableDataGetter<Todo>> = {
  serverside: getTodosFactory(
    mapParamsToQueryStringFactory({ pagination: true, searching: true })
  ),
  clientside: getClientsidePaginatedDataFactory(
    getTodosFactory(
      mapParamsToQueryStringFactory({ pagination: false, searching: false })
    ),
    (todo, searchPhrase) => todo.title.includes(searchPhrase)
  ),
};

export default function App() {
  const [dataGetterVariant, setDataGetterVariant] = useState('serverside');
  const dataGetter = useMemo(() => dataGetters[dataGetterVariant], [
    dataGetterVariant,
  ]);
  const dataProvider = useMemo(() => new BaseDataProvider(dataGetter), [
    dataGetter,
  ]);
  const stateProvider = useMemo(() => new TableStateProvider(dataProvider), [
    dataProvider,
  ]);

  const [tableState, error] = useObservable(stateProvider.tableStateWithData$);

  useEffect(() => {
    // NOTE: initial fetch
    dataProvider.refresh();
  }, [dataProvider]);

  const moveToPreviousPage = () =>
    stateProvider.setPage(tableState!.currentPage - 1);
  const moveToNextPage = () =>
    stateProvider.setPage(tableState!.currentPage + 1);

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
        {tableState?.currentPage}
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
    return <div>Error: {data.error}</div>;
  }

  return (
    <ul>
      {data.rows?.map((row) => (
        <li key={row.id}>{row.title}</li>
      ))}
    </ul>
  );
}
