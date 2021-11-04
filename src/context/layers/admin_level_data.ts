import moment from 'moment';
import { FeatureCollection } from 'geojson';
import { get, isNull, isString } from 'lodash';
import {
  BoundaryLayerProps,
  AdminLevelDataLayerProps,
} from '../../config/types';
import type { ThunkApi } from '../store';
import { getBoundaryLayerSingleton } from '../../config/utils';
import type { LayerData, LayerDataParams, LazyLoader } from './layer-data';
import { layerDataSelector } from '../mapStateSlice/selectors';

export type DataRecord = {
  adminKey: string; // refers to a specific admin boundary feature (cell on map). Could be several based off admin level
  value: string | number | null;
  date?: string | number;
};

export type AdminLevelDataLayerData = {
  features: FeatureCollection;
  layerData: DataRecord[];
};

export const fetchAdminLevelDataLayerData: LazyLoader<AdminLevelDataLayerProps> = () => async (
  { date, layer }: LayerDataParams<AdminLevelDataLayerProps>,
  api: ThunkApi,
) => {
  const formattedDate = date && moment(date).format('YYYY-MM-DD');
  const { path, adminCode, dataField } = layer;
  const { getState } = api;

  const adminBoundaryLayer = getBoundaryLayerSingleton();

  const adminBoundariesLayer = layerDataSelector(adminBoundaryLayer.id)(
    getState(),
  ) as LayerData<BoundaryLayerProps> | undefined;
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    // TODO we are assuming here it's already loaded. In the future if layers can be preloaded like boundary this will break.
    throw new Error('Boundary Layer not loaded!');
  }
  const adminBoundaries = adminBoundariesLayer.data;

  const { DataList: rawJSONs }: { DataList: { [key: string]: any }[] } = await (
    await fetch(path, {
      mode: path.includes('http') ? 'cors' : 'same-origin',
    })
  ).json();

  const rawWithDates = (rawJSONs || []).filter(obj => {
    return (
      moment(obj.date).format('YYYY-MM-DD') ===
      moment(formattedDate).format('YYYY-MM-DD')
    );
  });

  const layerData = rawWithDates
    .map(point => {
      const adminKey = point[adminCode] as string;
      if (!adminKey) {
        return undefined;
      }
      const value = get(point, dataField);
      return { adminKey, value };
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const adminBoundaryCode = get(
          properties,
          adminBoundaryLayer.adminCode,
        ) as string;
        const match = layerData.find(({ adminKey }) =>
          adminBoundaryCode.startsWith(adminKey),
        );
        if (match && !isNull(match.value)) {
          // Do we want support for non-numeric values (like string colors?)
          return {
            ...feature,
            properties: {
              ...properties,
              data: isString(match.value)
                ? parseFloat(match.value)
                : match.value,
            },
          };
        }
        return undefined;
      })
      .filter(f => f !== undefined),
  } as FeatureCollection;

  return {
    features,
    layerData,
  };
};
