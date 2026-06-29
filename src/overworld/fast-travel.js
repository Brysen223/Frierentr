import { dist } from "../core/math.js";

export function getWagonDestinations(wagons, origin) {
  if (!origin) return [];
  return wagons.filter((wagon) => wagon.discovered && wagon.id !== origin.id);
}

export function moveWagonSelection(current, direction, destinationCount) {
  if (destinationCount <= 0) return 0;
  return (current + direction + destinationCount) % destinationCount;
}

export function travelCost(origin, destination) {
  if (origin.mode !== destination.mode) return 35;
  return 10 + Math.round(dist(origin.x, origin.y, destination.x, destination.y) / 200);
}
