import { useHistory } from 'react-router-dom';
import moment from 'moment';

export enum AnalysisType {
  Exposure = 'exposure',
  Baseline = 'baseline',
}

export type URLParams = {
  hazardLayerId?: string;
  baselineLayerId?: string;
  date?: number;
  analysis?: AnalysisType;
};

const parseValue = (key: string, value: string): URLParams[keyof URLParams] => {
  switch (key) {
    case 'date':
      return moment(value).valueOf();
    default:
      return value;
  }
};

const valueToString = (
  key: string,
  value: URLParams[keyof URLParams],
): string => {
  switch (key) {
    case 'date':
      return moment(value).format('YYYY-MM-DD');
    default:
      return value as string;
  }
};

const parseHistory = (locationSearch: string): URLParams =>
  locationSearch === ''
    ? ({} as URLParams)
    : locationSearch
        .substring(1)
        .split('&')
        .map(l => l.split('='))
        .reduce(
          (obj, [key, value]) => ({
            ...obj,
            [key]: parseValue(key, value),
          }),
          {} as URLParams,
        );

const urlParamsToString = (params: URLParams): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${valueToString(key, value)}`)
    .join('&');

export const useUrlHistory = () => {
  const { replace, location } = useHistory();

  const urlParams = parseHistory(location.search);

  const updateHistory = (obj: URLParams) => {
    const newUrl = { ...urlParams, ...obj };
    replace({ search: urlParamsToString(newUrl) });
  };

  const clearHistory = () => {
    replace({ search: '' });
  };

  const clearAnalysisFromUrl = () => {
    const newUrl = Object.entries(urlParams).reduce((obj, [key, value]) => {
      if (key === 'analysis') {
        return obj;
      }

      return { ...obj, [key]: value };
    }, {} as URLParams);

    replace({ search: urlParamsToString(newUrl) });
  };

  return { urlParams, updateHistory, clearHistory, clearAnalysisFromUrl };
};
