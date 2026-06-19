const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const verifyLocation = async (userLat, userLon, workLocationId) => {
  const location = await prisma.workLocation.findUnique({
    where: { id: workLocationId },
  });

  if (!location) {
    const error = new Error('Ish joyi lokatsiyasi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (!location.isActive) {
    const error = new Error('Bu ish joyi lokatsiyasi faol emas');
    error.statusCode = 400;
    throw error;
  }

  const distance = calculateDistance(userLat, userLon, location.latitude, location.longitude);
  const maxRadius = location.radiusMeters || config.geofence.defaultRadius;

  return {
    isWithin: distance <= maxRadius,
    distance: Math.round(distance),
    radius: maxRadius,
    location: {
      id: location.id,
      name: location.name,
    },
  };
};

const findNearestLocation = async (latitude, longitude) => {
  const locations = await prisma.workLocation.findMany({
    where: { isActive: true },
  });

  if (locations.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const loc of locations) {
    const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
    const maxRadius = loc.radiusMeters || config.geofence.defaultRadius;

    if (distance <= maxRadius && distance < minDistance) {
      minDistance = distance;
      nearest = loc;
    }
  }

  if (nearest) {
    logger.debug(`Eng yaqin ish joyi: ${nearest.name} (${Math.round(minDistance)}m)`);
  }

  return nearest;
};

const isWithinGeofence = async (latitude, longitude) => {
  const locations = await prisma.workLocation.findMany({
    where: { isActive: true },
  });

  if (locations.length === 0) {
    logger.warn('Faol ish joyi lokatsiyalari topilmadi');
    return true;
  }

  for (const loc of locations) {
    const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
    const maxRadius = loc.radiusMeters || config.geofence.defaultRadius;

    if (distance <= maxRadius) {
      return true;
    }
  }

  return false;
};

module.exports = {
  calculateDistance,
  verifyLocation,
  findNearestLocation,
  isWithinGeofence,
};
