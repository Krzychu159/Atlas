"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

export type SessionEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  image: string;
  description: string;
  typ: string;
  trener: string;
  sala: string;
  poziom: string;
  zapisani: string;
  wariant: "primary" | "success" | "neutral" | "muted";
  uczestnicy: {
    name: string;
    initials: string;
    confirmed: boolean;
  }[];
};

const wydarzenia: SessionEvent[] = [
  {
    id: "1",
    title: "Crossfit Advanced",
    start: "2026-04-13T09:15:00",
    end: "2026-04-13T10:45:00",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
    description:
      "Zaawansowany trening siłowo-kondycyjny skupiony na mocy, dynamice i wytrzymałości.",
    typ: "Trening siłowy",
    trener: "Marek K.",
    sala: "Main Deck 02",
    poziom: "Pro",
    zapisani: "8 / 12",
    wariant: "neutral",
    uczestnicy: [
      { name: "Anna Kowalska", initials: "AK", confirmed: true },
      { name: "Piotr Nowak", initials: "PN", confirmed: false },
      { name: "Marta Kwiatkowska", initials: "MK", confirmed: true },
    ],
  },
  {
    id: "2",
    title: "Vinyasa Yoga Flow",
    start: "2026-04-15T11:30:00",
    end: "2026-04-15T12:45:00",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop",
    description:
      "Płynna praktyka vinyasy wspierająca mobilność, oddech i kontrolę ruchu.",
    typ: "Mind & Body",
    trener: "Julia N.",
    sala: "Studio Flow",
    poziom: "Open",
    zapisani: "10 / 16",
    wariant: "success",
    uczestnicy: [
      { name: "Karolina Lis", initials: "KL", confirmed: true },
      { name: "Ola Domańska", initials: "OD", confirmed: true },
      { name: "Natalia Wróbel", initials: "NW", confirmed: false },
    ],
  },
  {
    id: "3",
    title: "HIIT Burn Extreme",
    start: "2026-04-16T12:00:00",
    end: "2026-04-16T13:15:00",
    image:
      "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?q=80&w=1200&auto=format&fit=crop",
    description:
      "Dynamiczny trening interwałowy o wysokiej intensywności, nastawiony na spalanie tkanki tłuszczowej i poprawę wydolności.",
    typ: "Wysoka intensywność",
    trener: "Marek K.",
    sala: "Main Deck 02",
    poziom: "Pro",
    zapisani: "14 / 20",
    wariant: "primary",
    uczestnicy: [
      { name: "Anna Kowalska", initials: "AK", confirmed: true },
      { name: "Piotr Nowak", initials: "PN", confirmed: false },
      { name: "Marta Kwiatkowska", initials: "MK", confirmed: true },
      { name: "Ola Domańska", initials: "OD", confirmed: true },
    ],
  },
  {
    id: "4",
    title: "Pilates Core",
    start: "2026-04-17T14:30:00",
    end: "2026-04-17T15:20:00",
    image:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200&auto=format&fit=crop",
    description:
      "Trening wzmacniający centrum ciała, poprawiający stabilizację i kontrolę postawy.",
    typ: "Rehabilitacja",
    trener: "Anna W.",
    sala: "Recovery Room",
    poziom: "Basic",
    zapisani: "7 / 12",
    wariant: "muted",
    uczestnicy: [
      { name: "Ewa Kowalska", initials: "EK", confirmed: true },
      { name: "Tomasz Rybak", initials: "TR", confirmed: false },
    ],
  },
];

function getEventClasses(wariant?: SessionEvent["wariant"]) {
  if (wariant === "primary") return ["fc-event-primary"];
  if (wariant === "success") return ["fc-event-success"];
  if (wariant === "muted") return ["fc-event-muted"];
  return ["fc-event-neutral"];
}

function toCalendarEvents(data: SessionEvent[]) {
  return data.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.start,
    end: item.end,
    extendedProps: item,
  }));
}

type TrainingCalendarProps = {
  onSelectSession: (session: SessionEvent) => void;
};

export default function TrainingCalendar({
  onSelectSession,
}: TrainingCalendarProps) {
  type CalendarClickArg = {
    event: {
      extendedProps: unknown;
    };
  };

  const handleEventClick = (arg: CalendarClickArg) => {
    const session = arg.event.extendedProps as SessionEvent;
    onSelectSession(session);
  };

  return (
    <div className="schedule-calendar schedule-calendar-dense">
      <FullCalendar
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        allDaySlot={false}
        weekends={false}
        editable={false}
        selectable={false}
        nowIndicator={false}
        events={toCalendarEvents(wydarzenia)}
        eventClick={handleEventClick}
        height="auto"
        contentHeight="auto"
        expandRows={false}
        stickyHeaderDates={false}
        slotMinTime="09:00:00"
        slotMaxTime="15:30:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        scrollTime="09:00:00"
        dayHeaderFormat={{ weekday: "short" }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
        }}
        eventClassNames={(arg) =>
          getEventClasses((arg.event.extendedProps as SessionEvent)?.wariant)
        }
        eventContent={(arg) => {
          const data = arg.event.extendedProps as SessionEvent;

          return (
            <div className="fc-custom-event fc-custom-event-dense">
              <p className="fc-custom-event-tag">{data.typ}</p>
              <p className="fc-custom-event-title">{arg.event.title}</p>
              <div className="fc-custom-event-footer">
                <span className="fc-custom-event-time">{arg.timeText}</span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
