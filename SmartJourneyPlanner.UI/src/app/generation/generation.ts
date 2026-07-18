import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenerationService } from '../services/generation.service';
import { environment } from '../../environments/environment';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

@Component({
    selector: 'app-generation',
    imports: [CommonModule],
    templateUrl: './generation.html',
    styleUrls: ['./generation.css']
})
export class GenerationComponent implements OnInit, OnChanges {
  @Input() routeData: any;
  @Input() busData: any  = null;  // ✅ add
  @Input() transportMode: 'private' | 'public' = 'private'; // ✅ add
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
    const hasSinhala = /[\u0D80-\u0DFF]/.test(spot.name);
    const hasTamil   = /[\u0B80-\u0BFF]/.test(spot.name);

    // ✅ Already English — return as-is
    if (!hasSinhala && !hasTamil) return spot.name;

    // ✅ Extract English portion from mixed name
    // eg: "වයඹ - Wayamba Army War Memorial" → "Wayamba Army War Memorial"
    const englishPart = spot.name
      .split(/[\s\-–|]+/)  // split by spaces, dashes, pipes
      .filter((word: string) => /^[a-zA-Z0-9\s.,()'-]+$/.test(word) && word.trim().length > 1)
      .join(' ')
      .trim();

    if (englishPart.length > 3) {
      console.log(`✅ Extracted English "${spot.name}" → "${englishPart}"`);
      return englishPart;
    }

    // ✅ Fully Sinhala/Tamil — try Places API with English language
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
        + `?location=${spot.lat},${spot.lng}`
        + `&radius=200`
        + `&language=en`
        + `&key=${this.apiKey}`;

      const placesRes  = await fetch(placesUrl);
      const placesData = await placesRes.json();

      if (placesData.status === 'OK' && placesData.results?.length > 0) {
        for (const place of placesData.results) {
          const name       = place.name;
          const isSinhala  = /[\u0D80-\u0DFF]/.test(name);
          const isTamil    = /[\u0B80-\u0BFF]/.test(name);
          const isPlusCode = /^[23456789CFGHJMPQRVWX]{4,8}\+/.test(name);

          if (!isSinhala && !isTamil && !isPlusCode && name.length > 2) {
            console.log(`✅ Places API "${spot.name}" → "${name}"`);
            return name;
          }
        }
      }
    } catch (err) {
      console.error('❌ Translation failed:', spot.name, err);
    }

    // ✅ Last resort — return original
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
    // ✅ ADD THIS
  if (this.transportMode === 'public') {
    await this.downloadBusPDF();
    return;
  }
    if (!this.routeData)   { alert('No route data available.');         return; }
    if (this.isLoadingMap) { alert('Please wait for the map to load.'); return; }
    if (!this.mapBase64)   { alert('Map image is not ready yet.');      return; }

    // ✅ Generate QR code
  const appUrl = `http://localhost:4200/explore/route-optimization?start=${encodeURIComponent(this.routeData.startLocation)}&end=${encodeURIComponent(this.routeData.endLocation)}&mode=private`;
  const qrBase64 = await QRCode.toDataURL(appUrl, {
    width: 150,
    margin: 1,
    color: {
      dark: '#1a56db',  // blue dots
      light: '#ffffff'
    }
  });

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

      // fill color based on selection
      if (isSelected) {
        doc.setFillColor(26, 86, 219);
      } else {
        doc.setFillColor(245, 247, 250);
      }
      doc.roundedRect(14, tableY, pageWidth - 28, 30, 2, 2, 'F'); // ✅ 20 → 30

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isSelected ? 255 : 30, isSelected ? 255 : 30, isSelected ? 255 : 30);
      doc.text(r.label, 20, tableY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Distance: ${info.distance}`, 20, tableY + 16);
      doc.text(`Est. Time: ${info.duration}`, 85, tableY + 16);

      const petrol = info.petrolCost != null ? `Petrol: Rs. ${info.petrolCost}` : 'Petrol: N/A';
      const diesel = info.dieselCost != null ? `Diesel: Rs. ${info.dieselCost}` : 'Diesel: N/A';
            doc.text(petrol, 20, tableY + 24);
      doc.text(diesel, 85, tableY + 24);

      if (isSelected) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Selected', pageWidth - 20, tableY + 8, { align: 'right' });
      }

      tableY += 34; // ✅ 24 → 34
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

        // ✅ Show real distance from route instead of coordinates
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          spot.distanceFromRoute ? `${spot.distanceFromRoute} from route` : '',
          pageWidth - 20, vY + 7, { align: 'right' }
        );

        vY += 20;
      });
    }

          // ── QR CODE SECTION ──────────────────────────────────────
      doc.addPage();

      doc.setFillColor(26, 86, 219);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Share This Route', 14, 12);

      // QR code image
      doc.addImage(qrBase64, 'PNG', 14, 30, 50, 50);

      // Instructions next to QR
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Open in Smart Journey Planner', 72, 45);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Scan this QR code to open this route', 72, 55);
      doc.text('directly in the app on your device.', 72, 63);

      // URL text below QR (fallback)
      doc.setFontSize(8);
      doc.setTextColor(26, 86, 219);
      doc.text(appUrl, 14, 88);

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

  /**
   * ── PUBLIC TRANSPORT (BUS) PDF ─────────────────────────────
   * Generates a standalone PDF for bus journeys, kept fully separate
   * from the private route PDF above. Shares the same visual language
   * (header bar, footer bar, QR share section) but contains only
   * bus-specific content — no map, no route comparison table.
   */
  private async downloadBusPDF(): Promise<void> {
    if (!this.busData) { alert('No bus data available.'); return; }

    const doc        = new jsPDF('p', 'mm', 'a4');
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── HEADER (same style as private PDF) ─────────────────
    doc.setFillColor(26, 86, 219);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Journey Planner', 14, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Public Transport Report', 14, 22);
    doc.setFontSize(9);
    doc.text(
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
      pageWidth - 14, 22, { align: 'right' }
    );

    // ── TRIP INFO ───────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(this.busData.from || '', 30, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('To:', 14, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(this.busData.to || '', 30, 46);

    // ── BUS JOURNEY DETAILS TITLE ────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Bus Journey Details', 14, 58);
    doc.setDrawColor(26, 86, 219);
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);

    let yPos = 66;

    // ── DIRECT ROUTE ─────────────────────────────────────────
    if (!this.busData.isMultiLeg) {
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 40, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Bus Route ${this.busData.routeNo}`, 20, yPos + 10);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`From : ${this.busData.from}`, 20, yPos + 20);
      doc.text(`To   : ${this.busData.to}`,   20, yPos + 28);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Fare : Rs. ${this.busData.fare}`, 20, yPos + 36);

      yPos += 50;
    }
    // ── MULTI-LEG ROUTE ──────────────────────────────────────
    else {
      // Leg 1 card
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 34, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Bus ${this.busData.routeNo1}`, 20, yPos + 10);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`From : ${this.busData.from}`,        20, yPos + 18);
      doc.text(`To   : ${this.busData.interchange}`, 20, yPos + 26);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Fare : Rs. ${this.busData.fareLeg1}`, pageWidth - 20, yPos + 18, { align: 'right' });

      yPos += 40;

      // Interchange notice
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(14, yPos, pageWidth - 28, 14, 2, 2, 'F');
      doc.setDrawColor(26, 86, 219);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 14, yPos + 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Change bus at: ${this.busData.interchange}`, 20, yPos + 9);
      yPos += 22;

      // Leg 2 card
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 34, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Bus ${this.busData.routeNo2}`, 20, yPos + 10);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`From : ${this.busData.interchange}`, 20, yPos + 18);
      doc.text(`To   : ${this.busData.to}`,          20, yPos + 26);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 86, 219);
      doc.text(`Fare : Rs. ${this.busData.fareLeg2}`, pageWidth - 20, yPos + 18, { align: 'right' });

      yPos += 40;

      // Total fare banner
      doc.setFillColor(26, 86, 219);
      doc.roundedRect(14, yPos, pageWidth - 28, 16, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Total Bus Fare', 20, yPos + 10);
      doc.text(`Rs. ${this.busData.totalFare}`, pageWidth - 20, yPos + 10, { align: 'right' });

      yPos += 26;
    }

    // ── QR CODE SECTION (same style as private PDF) ─────────
    const appUrl = `http://localhost:4200/explore/route-optimization` +
                  `?start=${encodeURIComponent(this.busData.from || '')}` +
                  `&end=${encodeURIComponent(this.busData.to || '')}` +
                  `&mode=public`;
    const qrBase64 = await QRCode.toDataURL(appUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#1a56db', light: '#ffffff' }
    });

    const shareTitleY = yPos + 10;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Share This Route', 14, shareTitleY);
    doc.setDrawColor(26, 86, 219);
    doc.line(14, shareTitleY + 2, pageWidth - 14, shareTitleY + 2);

    const qrY = shareTitleY + 8;
    doc.addImage(qrBase64, 'PNG', 14, qrY, 50, 50);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Open in Smart Journey Planner', 72, qrY + 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Scan this QR code to open this route', 72, qrY + 25);
    doc.text('directly in the app on your device.', 72, qrY + 33);

    doc.setFontSize(8);
    doc.setTextColor(26, 86, 219);
    doc.text(appUrl, 14, qrY + 58);

    // ── FOOTER ON EVERY PAGE (dynamic, same as private PDF) ──
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
    doc.save(`Bus_Report_${this.busData.to || 'Report'}.pdf`);
  }
}