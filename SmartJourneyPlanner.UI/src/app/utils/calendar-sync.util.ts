import { Trip } from '../models/trip-timeline.model';

export class CalendarSyncUtil {
  
  static generateICS(trip: Trip): string {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SmartJourneyPlanner//TripTimeline//EN\n";

    trip.days.forEach(day => {
      // Parse the 'YYYY-MM-DD (Day X)' format dummy date to base date
      const datePart = day.date.split(' ')[0]; // E.g., '2024-05-10'
      const baseDate = new Date(datePart);

      day.events.forEach(event => {
        // Time parsing (dummy '07:00 AM')
        const [timePart, meridiem] = event.time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const startDateTime = new Date(baseDate);
        startDateTime.setHours(hours, minutes, 0);

        // For simplicity, assume events take 1 hour
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const dtStart = this.formatDate(startDateTime);
        const dtEnd = this.formatDate(endDateTime);
        const stamp = this.formatDate(new Date());

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTAMP:${stamp}\n`;
        icsContent += `DTSTART:${dtStart}\n`;
        icsContent += `DTEND:${dtEnd}\n`;
        icsContent += `SUMMARY:${event.title}\n`;
        icsContent += `DESCRIPTION:${event.description}\n`;
        icsContent += `LOCATION:${event.location}\n`;
        icsContent += "END:VEVENT\n";
      });
    });

    icsContent += "END:VCALENDAR";
    return icsContent;
  }

  static downloadICSFile(trip: Trip) {
    const icsContent = this.generateICS(trip);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${trip.name.replace(/\s+/g, '_')}_Itinerary.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  static openInGoogleCalendar(trip: Trip) {
    const title = encodeURIComponent(trip.name);
    
    const parseToFormat = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
          return new Date().toISOString().replace(/[-:]/g, '').split('T')[0];
      }
      return d.toISOString().replace(/[-:]/g, '').split('T')[0];
    };

    let startStr = '';
    let endStr = '';

    if (trip.days && trip.days.length > 0) {
      startStr = parseToFormat(trip.days[0].date);
      // Google Calendar end date for all-day events is exclusive, so we add 1 day
      const lastDate = new Date(trip.days[trip.days.length - 1].date);
      if (!isNaN(lastDate.getTime())) {
        lastDate.setDate(lastDate.getDate() + 1);
        endStr = parseToFormat(lastDate.toISOString());
      } else {
        endStr = startStr;
      }
    } else {
      startStr = parseToFormat(trip.startDate);
      const endD = new Date(trip.endDate);
      endD.setDate(endD.getDate() + 1);
      endStr = parseToFormat(endD.toISOString());
    }

    let details = `Detailed Itinerary for ${trip.name}:\n\n`;
    if (trip.days) {
      trip.days.forEach((day, index) => {
        details += `Day ${index + 1} (${day.date}):\n`;
        if(day.events && day.events.length > 0) {
           day.events.forEach(e => {
             details += `- ${e.time}: ${e.title} @ ${e.location}\n`;
           });
        } else {
           details += `- No events planned yet.\n`;
        }
        details += `\n`;
      });
    }
    
    const encodedDetails = encodeURIComponent(details).replace(/%20/g, '+');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${encodedDetails}`;
    
    // Open in a new tab
    window.open(url, '_blank');
  }
}
