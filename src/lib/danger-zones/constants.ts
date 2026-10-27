/** Lengths from the 2011 Interior / AFFTAC driving-aid protocol. */
export const TOWN_LENGTH_M = 300;
export const ROAD_LENGTH_M = 2000;
export const MOTORWAY_LENGTH_M = 4000;

/**
 * Circle radius as a fraction of the section length.
 * A center shifted by at most 0.55 × R still leaves a crossing of at least L
 * through the original point, with margin for coordinate rounding.
 */
export const RADIUS_FACTOR = 0.625;
export const OFFSET_FRACTION_MIN = 0.08;
export const OFFSET_FRACTION_SPAN = 0.47;

export const TOWN_RADIUS_M = TOWN_LENGTH_M * RADIUS_FACTOR;
export const ROAD_RADIUS_M = ROAD_LENGTH_M * RADIUS_FACTOR;
export const MOTORWAY_RADIUS_M = MOTORWAY_LENGTH_M * RADIUS_FACTOR;

export const ALLOWED_RADIUS_M = [TOWN_RADIUS_M, ROAD_RADIUS_M, MOTORWAY_RADIUS_M] as const;

export const EXIT_MARGIN_M = 150;
export const ENTER_SPEED_KMH = 20;
export const CONFIRM_POINTS = 2;
export const COOLDOWN_MS = 5 * 60 * 1000;
export const GPS_LOSS_MS = 60 * 1000;

/** A fix faster than this, or a sharp turn over a long hop, is treated as a GPS jump. */
export const JUMP_SPEED_KMH = 200;
export const JUMP_HEADING_DEG = 120;
export const JUMP_DISTANCE_M = 80;

export const DATASET_ID = "6712583387af110196942793";
export const PUBLISHER = "Ministère de l'Intérieur";
export const LICENSE = "Licence Ouverte 2.0";
