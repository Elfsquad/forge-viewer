
export class ThreeHelpers {

    public static getNearestPoint(targetPoint: THREE.Vector3, points: THREE.Vector3[]): THREE.Vector3 {
        let minDist = Infinity;
        let nearestPoint = undefined;
        for (let i = 0; i < points.length; i++) {
            const dist = points[i].distanceToSquared(targetPoint);
            if (dist < minDist) {
                minDist = dist;
                nearestPoint = points[i];
            }
        }
        return nearestPoint ?? targetPoint;
    }

}