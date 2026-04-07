// AI generated file. Mock data for training calendar preview. Do not edit.

"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

const events = [
  {
    id: "1",
    title: "Cross Training",
    start: "2026-04-06T08:00:00",
    end: "2026-04-06T09:00:00",
  },
  {
    id: "2",
    title: "Yoga",
    start: "2026-04-07T18:00:00",
    end: "2026-04-07T19:00:00",
  },
  {
    id: "3",
    title: "Personal Session",
    start: "2026-04-08T10:30:00",
    end: "2026-04-08T11:30:00",
  },
  {
    id: "4",
    title: "Mobility",
    start: "2026-04-10T17:00:00",
    end: "2026-04-10T18:00:00",
  },
];

export default function TrainingCalendar() {
  return (
    <div className="training-calendar-preview">
      <FullCalendar
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        allDaySlot={false}
        weekends={false}
        editable={false}
        selectable={false}
        nowIndicator={true}
        events={events}
        height="auto"
        expandRows={false}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="01:00:00"
        dayHeaderFormat={{ weekday: "short" }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
        }}
      />
    </div>
  );
}
