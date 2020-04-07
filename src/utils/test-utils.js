import { Map } from 'immutable';
import configureStore from 'redux-mock-store';

// import { store } from '../context/store';
import { createMock } from 'ts-auto-mock';
const mock: Person = createMock<Person>();

const layers

const mockStore = configureStore([]);
export const mockedStore = mockStore({
  mapState: Map({
    layers: Set([
      {}
    ])
  }),
});
