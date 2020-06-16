import { FeatureCollection } from 'geojson';
import { isNull, isString } from 'lodash';
import { LayerDataParams } from './layer-data';
import { NSOLayerProps } from '../../config/types';

// FIXME: for now, directly import these files. This bloats the code bundle - they should be hosted externally.
import adminBoundariesRaw from '../../config/admin_boundaries.json';
import nsoPovertyHc from '../../data/nso/lka-poverty-admin3.json';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

const nsoDatasets = {
  nsoPovertyHc,
} as const;

type DataRecord = {
  adminKey: string;
  value: string | number | null;
};

export type NSOLayerData = {
  features: FeatureCollection;
  layerData: DataRecord[];
};

const isNSOKey = (maybeKey: string): maybeKey is keyof typeof nsoDatasets =>
  Object.keys(nsoDatasets).includes(maybeKey);

export async function fetchNsoLayerData(
  params: LayerDataParams<NSOLayerProps>,
) {
  const { layer } = params;
  const { path, adminCode } = layer;

  // TODO: make async request for external data here.
  if (!isNSOKey(path)) {
    throw new Error(`Unknown NSO dataset key '${path}' found.`);
  }
  const {
    DataList: rawJSON,
  }: { DataList: { [key: string]: any }[] } = nsoDatasets[path];

  const layerData = (rawJSON || [])
    .map(point => {
      const adminKey = point[adminCode];
      if (!adminKey) {
        return undefined;
      }
      const value = point.DTVAL_CO !== undefined ? point.DTVAL_CO : null;
      return { adminKey, value };
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const nsoCode = (properties || {}).dsd_code;
        const match = layerData.find(
          ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
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
}
