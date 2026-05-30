function distanceSquared(pointA, pointB) {
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return dx * dx + dy * dy;
}

function betterCandidate(candidateA, candidateB) {
  if (!candidateA) return candidateB;
  if (!candidateB) return candidateA;

  return candidateA.distanceSquared <= candidateB.distanceSquared
    ? candidateA
    : candidateB;
}

function bruteForce(points) {
  let best = null;

  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const squaredDistance = distanceSquared(points[left], points[right]);
      best = betterCandidate(best, {
        pair: [points[left], points[right]],
        distanceSquared: squaredDistance,
        distance: Math.sqrt(squaredDistance),
      });
    }
  }

  return best;
}

function solveRecursively(sortedByX, sortedByY) {
  if (sortedByX.length <= 3) {
    return bruteForce(sortedByX);
  }

  const middleIndex = Math.floor(sortedByX.length / 2);
  const middleX = sortedByX[middleIndex].x;

  const leftByX = sortedByX.slice(0, middleIndex);
  const rightByX = sortedByX.slice(middleIndex);
  const leftKeys = new Set(leftByX.map((point) => `${point.x}-${point.y}`));

  const leftByY = [];
  const rightByY = [];

  for (const point of sortedByY) {
    if (leftKeys.has(`${point.x}-${point.y}`)) {
      leftByY.push(point);
    } else {
      rightByY.push(point);
    }
  }

  const bestLeft = solveRecursively(leftByX, leftByY);
  const bestRight = solveRecursively(rightByX, rightByY);
  let best = betterCandidate(bestLeft, bestRight);

  const strip = sortedByY.filter(
    (point) => Math.abs(point.x - middleX) ** 2 < best.distanceSquared,
  );

  for (let index = 0; index < strip.length; index += 1) {
    for (
      let compareIndex = index + 1;
      compareIndex < strip.length && compareIndex <= index + 7;
      compareIndex += 1
    ) {
      const squaredDistance = distanceSquared(
        strip[index],
        strip[compareIndex],
      );

      if (squaredDistance < best.distanceSquared) {
        best = {
          pair: [strip[index], strip[compareIndex]],
          distanceSquared: squaredDistance,
          distance: Math.sqrt(squaredDistance),
        };
      }
    }
  }

  return best;
}

export function closestPairDivideAndConquer(points) {
  if (points.length < 2) {
    return null;
  }

  const sortedByX = [...points].sort(
    (pointA, pointB) => pointA.x - pointB.x || pointA.y - pointB.y,
  );
  const sortedByY = [...points].sort(
    (pointA, pointB) => pointA.y - pointB.y || pointA.x - pointB.x,
  );

  return solveRecursively(sortedByX, sortedByY);
}
