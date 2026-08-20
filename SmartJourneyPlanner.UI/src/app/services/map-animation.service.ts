import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class MapAnimationService {
  private activeSpiderifiedCluster: any = null;

  // Resets and unspiderfies any currently expanded marker cluster on the map 
  public resetOpenCluster(): void {
    if (this.activeSpiderifiedCluster && typeof this.activeSpiderifiedCluster.unspiderfy === 'function') {
      try {
        this.activeSpiderifiedCluster.unspiderfy();
      } catch (err) {
        console.warn('Unable to unspiderfy active cluster:', err);
      }
      this.activeSpiderifiedCluster = null;
    }
  }

  // Smoothly animates the vehicle marker position and map camera to target coordinates 
  public async animateVehicleMovement(
    vehicleMarker: L.Marker,
    map: L.Map,
    oldCoords: L.LatLngLiteral,
    newCoords: L.LatLngLiteral,
    isFullscreen: boolean
  ): Promise<void> {
    if (!vehicleMarker || !map) return;

    this.resetOpenCluster();

    const duration = 2800; // Animation duration in milliseconds
    const startLat = oldCoords.lat;
    const startLng = oldCoords.lng;
    const endLat = newCoords.lat;
    const endLng = newCoords.lng;

    map.panTo([endLat, endLng], { animate: true, duration: duration / 1000 });

    return new Promise<void>((resolve) => {
      const startTime = performance.now();

      const animateStep = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // Ease-in-out quadratic interpolation
        const easedProgress =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentLat = startLat + (endLat - startLat) * easedProgress;
        const currentLng = startLng + (endLng - startLng) * easedProgress;

        vehicleMarker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
          requestAnimationFrame(animateStep);
        } else {
          vehicleMarker.setLatLng([endLat, endLng]);
          resolve();
        }
      };

      requestAnimationFrame(animateStep);
    });
  }

  // Triggers spiderify on the parent cluster containing the target marker if collapsed.
  public async triggerClusterSpiderify(clusterGroup: any, targetMarker: L.Marker): Promise<void> {
    if (!clusterGroup || !targetMarker) return;

    this.resetOpenCluster();

    if (typeof clusterGroup.getVisibleParent === 'function') {
      const visibleParent = clusterGroup.getVisibleParent(targetMarker);
      if (visibleParent && typeof visibleParent.spiderfy === 'function') {
        try {
          visibleParent.spiderfy();
          this.activeSpiderifiedCluster = visibleParent;
        } catch (err) {
          console.warn('Unable to spiderfy target cluster:', err);
        }
      }
    }
  }

  // Animates the display transition of the slideshow container element.
  public async animateSlideshowBoxShow(element: HTMLElement): Promise<void> {
    if (!element) return;

    element.classList.remove('hide-during-move');
    element.classList.add('animate-fade-in');

    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 250);
    });
  }
}