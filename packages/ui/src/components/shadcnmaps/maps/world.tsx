"use client";

import { type MapProps, Map as MapRoot } from "../map";
import { worldMapData } from "../map-data/world";

export { worldMapData };

export type RegionId = (typeof worldMapData)["regions"][number]["id"];

export interface WorldMapProps extends Omit<MapProps, "data"> {}

export function WorldMap(props: WorldMapProps) {
	return <MapRoot data={worldMapData} {...props} />;
}
