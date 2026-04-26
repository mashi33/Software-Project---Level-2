import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenerationService } from '../services/generation.service';
import { environment } from '../../environments/environment';
import jsPDF from 'jspdf';

@Component({
    selector: 'app-generation',
    imports: [CommonModule],
    templateUrl: './generation.html',
    styleUrls: ['./generation.css']
})
export class GenerationComponent implements OnInit, OnChanges {
  @Input() routeData: any;
  mapBase64:    string  = '';
  isLoadingMap: boolean = false;
  today:        number  = Date.now();
  apiKey:       string  = environment.googleMapsApiKey;

  constructor(private mapService: GenerationService) {}

  ngOnInit(): void {
    console.log('🚀 GenerationComponent initialized, routeData:', this.routeData);
    if (this.routeData) this.loadMapFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges triggered:', changes);
    if (changes['routeData'] && !changes['routeData'].firstChange && this.routeData) {
      console.log('✅ routeData changed, reloading map...');
      this.loadMapFromBackend();
    }
  }

  loadMapFromBackend() {
    console.log('🔍 Full routeData received:', this.routeData);

    if (!this.routeData?.polyline) {
      console.warn('❌ Polyline is missing! routeData:', this.routeData);
      return;
    }

    console.log('✅ Polyline found, length:', this.routeData.polyline.length);
    console.log('✅ Markers:', this.routeData.markerString);

    this.isLoadingMap = true;
    let path = this.routeData.polyline;

    if (path.length > 5000) {
      console.log('⚠️ Polyline too long (' + path.length + ' chars), simplifying...');
      path = this.simplifyPolyline(path);
      console.log('✅ Simplified polyline length:', path.length);
    }

    const markers = this.routeData.markerString || '';

    console.log('📤 Sending to backend:', {
      path: path.substring(0, 80),
      pathLength: path.length,
      markers: markers,
      apiKey: this.apiKey ? '✅ exists' : '❌ missing'
    });

    this.mapService.getStaticMap(path, markers, this.apiKey).subscribe({
      next: (res: any) => {
        console.log('✅ Map loaded successfully');
        this.mapBase64    = 'data:image/png;base64,' + res.image;
        this.isLoadingMap = false;
      },
      error: (err: any) => {
        console.error('❌ Map loading failed:', {
          status: err.status,
          message: err.message,
          error: err.error
        });
        this.isLoadingMap = false;
      }
    });
  }

  // ── TRANSLATE SPOT NAME TO ENGLISH VIA GOOGLE GEOCODING ──
  // Uses lat/lng to get the official English place name
  private async getEnglishName(spot: any): Promise<string> {
    // If name is already English (no Sinhala/Tamil unicode), return as-is
    const hasSinhala = /[\u0D80-\u0DFF]/.test(spot.name); // Sinhala unicode range
    const hasTamil   = /[\u0B80-\u0BFF]/.test(spot.name); // Tamil unicode range

    if (!hasSinhala && !hasTamil) {
      return spot.name; // ✅ Already English — no API call needed
    }

    // Only call Geocoding API if name has Sinhala or Tamil characters
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json`
        + `?latlng=${spot.lat},${spot.lng}`
        + `&language=en`           // ← forces English response
        + `&key=${this.apiKey}`;

      const response = await fetch(url);
      const data     = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        // Use the most specific result name available
        const result = data.results[0];

        // Try to find a named establishment or point of interest first
        const poiComponent = result.address_components?.find((c: any) =>
          c.types.includes('point_of_interest') ||
          c.types.includes('establishment') ||
          c.types.includes('natural_feature') ||
          c.types.includes('park')
        );

        if (poiComponent) {
          console.log(`✅ Translated "${spot.name}" → "${poiComponent.long_name}"`);
          return poiComponent.long_name;
        }

        // Fallback to formatted address first part
        const formattedName = result.formatted_address?.split(',')[0];
        console.log(`✅ Translated "${spot.name}" → "${formattedName}"`);
        return formattedName || spot.name;
      }
    } catch (err) {
      console.error('❌ Geocoding failed for spot:', spot.name, err);
    }

    // If API fails for any reason, return original name
    return spot.name;
  }

  // ── TRANSLATE ALL SPOTS BEFORE BUILDING PDF ───────────────
  private async translateAllSpots(stops: any[]): Promise<any[]> {
    if (!stops || stops.length === 0) return [];

    console.log('🌐 Translating scenic spot names to English...');

    // Run all translations in parallel for speed
    const translated = await Promise.all(
      stops.map(async (spot) => ({
        ...spot,
        name: await this.getEnglishName(spot)
      }))
    );

    console.log('✅ All spots translated:', translated.map(s => s.name));
    return translated;
  }

  private simplifyPolyline(encoded: string): string {
    const points = this.decodePolyline(encoded);
    const skipFactor = Math.ceil(points.length / 200);
    const simplified = points.filter((_, i) => i % skipFactor === 0);
    if (simplified[simplified.length - 1] !== points[points.length - 1]) {
      simplified.push(points[points.length - 1]);
    }
    return this.encodePolyline(simplified);
  }

  private decodePolyline(encoded: string): { lat: number, lng: number }[] {
    const points: { lat: number, lng: number }[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : result >> 1;
      shift = 0; result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : result >> 1;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  }

  private encodePolyline(points: { lat: number, lng: number }[]): string {
    let output = '';
    let prevLat = 0, prevLng = 0;
    const encodeValue = (value: number): string => {
      let v = Math.round(value * 1e5);
      v = v < 0 ? ~(v << 1) : v << 1;
      let chunk = '';
      while (v >= 0x20) {
        chunk += String.fromCharCode(((0x20 | (v & 0x1f)) + 63));
        v >>= 5;
      }
      chunk += String.fromCharCode(v + 63);
      return chunk;
    };
    points.forEach(point => {
      output += encodeValue(point.lat - prevLat);
      output += encodeValue(point.lng - prevLng);
      prevLat = point.lat;
      prevLng = point.lng;
    });
    return output;
  }

  async downloadPDF() {
    if (!this.routeData)   { alert('No route data available.');         return; }
    if (this.isLoadingMap) { alert('Please wait for the map to load.'); return; }
    if (!this.mapBase64)   { alert('Map image is not ready yet.');      return; }

    // ✅ Translate all scenic spot names to English BEFORE building PDF
    const translatedStops = await this.translateAllSpots(this.routeData.stops || []);

    const doc        = new jsPDF('p', 'mm', 'a4');
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── HEADER ────────────────────────────────────────────────
    doc.setFillColor(26, 86, 219);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Journey Planner', 14, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Route Optimization Report', 14, 22);
    doc.setFontSize(9);
    doc.text(
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
      pageWidth - 14, 22, { align: 'right' }
    );

    // ── TRIP INFO ─────────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(this.routeData.startLocation || '', 30, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('To:', 14, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(this.routeData.endLocation || '', 30, 46);

    // ── ROUTE COMPARISON TABLE ────────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Route Comparison', 14, 58);
    doc.setDrawColor(26, 86, 219);
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);

    const routes = [
      { key: 'fastest',  label: 'Fastest Route'  },
      { key: 'scenic',   label: 'Scenic Route'   },
      { key: 'cheapest', label: 'Cheapest Route' }
    ];

    let tableY = 64;

    routes.forEach(r => {
      const info       = this.routeData.allRoutes?.[r.key];
      if (!info) return;

      const isSelected = this.routeData.selectedType === r.key.toUpperCase();

      if (isSelected) {
        doc.setFillColor(26, 86, 219);
      } else {
        doc.setFillColor(245, 247, 250);
      }
      doc.roundedRect(14, tableY, pageWidth - 28, 20, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        isSelected ? 255 : 30,
        isSelected ? 255 : 30,
        isSelected ? 255 : 30
      );
      doc.text(r.label, 20, tableY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Distance: ${info.distance}`, 20, tableY + 15);
      doc.text(`Est. Time: ${info.duration}`, 85, tableY + 15);

      if (isSelected) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Selected', pageWidth - 20, tableY + 8, { align: 'right' });
      }

      tableY += 24;
    });

    // ── MAP VIEW ──────────────────────────────────────────────
    const mapTitleY = tableY + 6;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Map View  —  ${this.routeData.selectedType} Route`,
      14, mapTitleY
    );
    doc.setDrawColor(26, 86, 219);
    doc.line(14, mapTitleY + 2, pageWidth - 14, mapTitleY + 2);

    const mapY      = mapTitleY + 6;
    const mapHeight = pageHeight - mapY - 16;
    doc.addImage(this.mapBase64, 'PNG', 14, mapY, pageWidth - 28, mapHeight);

    // ── SCENIC VIEWPOINTS PAGE ────────────────────────────────
    // ✅ Uses translatedStops — all names now in English
    if (translatedStops.length > 0) {
      doc.addPage();

      doc.setFillColor(26, 86, 219);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Scenic Viewpoints Along the Route', 14, 12);

      doc.setTextColor(30, 30, 30);
      let vY = 26;

      translatedStops.forEach((spot: any, i: number) => {
        if (vY > 270) { doc.addPage(); vY = 20; }

        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, vY, pageWidth - 28, 16, 2, 2, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(`${i + 1}.  ${spot.name || 'Scenic Spot'}`, 20, vY + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `${spot.lat?.toFixed(4)}, ${spot.lng?.toFixed(4)}`,
          pageWidth - 20, vY + 7, { align: 'right' }
        );

        vY += 20;
      });
    }

    // ── FOOTER ON EVERY PAGE ──────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 86, 219);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Smart Journey Planner  •  support@smartjourney.com',
        14, pageHeight - 3
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - 14, pageHeight - 3, { align: 'right' }
      );
    }

    // ── SAVE ─────────────────────────────────────────────────
    doc.save(`Journey_Plan_${this.routeData.endLocation || 'Report'}.pdf`);
  }
}