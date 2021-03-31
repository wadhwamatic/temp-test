import GeoJSON from 'geojson';
import moment from 'moment';
import type { LazyLoader } from './layer-data';
import { PointDataLayerProps } from '../../config/types';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointLayerData;
}

export type PointLayerData = {
  lat: number;
  lon: number;
  date: number; // in unix time.
  [key: string]: any;
}[];

type WmsGeoJSONData = {
  [key: string]: any;
  features: {
    [key: string]: any;
    geometry: {
      type: string;
      coordinates: number[];
    };
    properties: {
      [key: string]: any;
    };
  }[];
};

async function loadBasePointData(url: string) {
  return (await (await fetch(url, { mode: 'cors' })).json()) as PointLayerData;
}

async function loadWmsPointData(url: string, date: number) {
  const base = (await (
    await fetch(url, { mode: 'cors' })
  ).json()) as WmsGeoJSONData;
  return base.features.map(f => {
    return {
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      date,
      ...f.properties,
    };
  }) as PointLayerData;
}

async function loadFallbackData(url: string, date: number) {
  // fallback data isn't filtered, therefore we must filter it.
  return ((await (await fetch(url || '')).json()) as PointLayerData).filter(
    // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
    // using moment here helps compensate for these discrepancies
    obj =>
      moment(obj.date).format('YYYY-MM-DD') ===
      moment(date).format('YYYY-MM-DD'),
  );
}

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> = () => async ({
  date,
  layer: { data: dataUrl, fallbackData, dataFormat },
}) => {
  // This function fetches point data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  // the content inside { .. } brackets in the URL
  // will be the date format and will be rendered as date string with momentjs
  const url = dataUrl.replace(/{.*?}/g, match => {
    const format = match.slice(1, -1);
    return moment(date).format(format);
  });

  const data: PointLayerData = await (async () => {
    try {
      if (dataFormat === 'base') {
        return loadBasePointData(url);
      }
      if (dataFormat === 'wms') {
        return loadWmsPointData(url, moment(date).valueOf());
      }
      throw new Error(`Unhandled data format: ${dataFormat}`);
    } catch (ignored) {
      return loadFallbackData(fallbackData || '', moment(date).valueOf());
    }
  })();
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};
