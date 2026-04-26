/**
 * This utility class helps export the trip itinerary to calendar apps 
 * like Google Calendar or Apple Calendar (ICS format).
 */

import { TimelinePlan } from '../models/trip-timeline.model';

export class CalendarSyncUtil {
  
  /**
   * Generates a standard .ICS file content (iCalendar format)
   * This is used by most calendar apps (Outlook, Apple, etc.)
   */
  static generateICS(timeline: TimelinePlan): string {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SmartJourneyPlanner//TripTimeline//EN\n";

    // Loop through each day and each event to add them to the calendar content
    timeline.days.forEach(day => {
      const baseDate = new Date(day.date);

      day.events.forEach(event => {
        // Parse the time string (e.g. "10:30 AM" or "22:00")
        const [timePart, meridiem] = event.time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        
        // Convert to 24-hour format if user used AM/PM
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const startDateTime = new Date(baseDate);
        startDateTime.setHours(hours, minutes, 0);

        // Assume events take 1 hour for the calendar block
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const dtStart = this.formatDate(startDateTime);
        const dtEnd = this.formatDate(endDateTime);
        const stamp = this.formatDate(new Date());

        // Add the event details in ICS format
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

  /**
   * Creates a file and triggers a download in the user's browser.
   */
  static downloadICSFile(timeline: TimelinePlan) {
    const icsContent = this.generateICS(timeline);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${timeline.name.replace(/\s+/g, '_')}_Itinerary.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Formats a Javascript Date object into the weird format required by Calendar files (YYYYMMDDTHHMMSSZ)
   */
  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Opens the Google Calendar website in a new tab with the trip details pre-filled.
   */
  static openInGoogleCalendar(timeline: TimelinePlan) {
    const title = encodeURIComponent(timeline.name);
    
    // Helper to format date for the URL
    const parseToFormat = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
          return new Date().toISOString().replace(/[-:]/g, '').split('T')[0];
      }
      return d.toISOString().replace(/[-:]/g, '').split('T')[0];
    };

    let startStr = '';
    let endStr = '';

    // Calculate the start and end dates for the entire trip block
    if (timeline.days && timeline.days.length > 0) {
      startStr = parseToFormat(timeline.days[0].date);
      // Google Calendar end date is exclusive, so we add 1 extra day
      const lastDate = new Date(timeline.days[timeline.days.length - 1].date);
      if (!isNaN(lastDate.getTime())) {
        lastDate.setDate(lastDate.getDate() + 1);
        endStr = parseToFormat(lastDate.toISOString());
      } else {
        endStr = startStr;
      }
    } else {
      startStr = parseToFormat(timeline.startDate);
      const endD = new Date(timeline.endDate);
      endD.setDate(endD.getDate() + 1);
      endStr = parseToFormat(endD.toISOString());
    }

    // Build the "Description" text box for the calendar event
    let details = `Detailed Itinerary for ${timeline.name}:\n\n`;
    if (timeline.days) {
      timeline.days.forEach((day, index) => {
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
    
    // Create the final Google Calendar URL
    const encodedDetails = encodeURIComponent(details).replace(/%20/g, '+');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${encodedDetails}`;
    
    // Open the generated URL in a new browser tab
    window.open(url, '_blank');
  }
}
