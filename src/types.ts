export type Attachment =
  | { kind: 'image'; id: string; blobKey: string; thumbKey: string; caption?: string }
  | { kind: 'link'; id: string; url: string; caption?: string };

export type LogEntry = {
  id: string;
  at: string;
  did: string;
  broke: string;
  nextAction: string;
  durationMin: number;
  wasFloor: boolean;
  wasColdStart: boolean;
  attachments: Attachment[];
};

export type Project = {
  id: string;
  name: string;
  nextAction: string;
  createdAt: string;
  lastTouchedAt: string;
  archived: boolean;
  log: LogEntry[];
};

export type ParkingItem = {
  id: string;
  at: string;
  projectId: string | null;
  text: string;
  resolved: boolean;
};

export type DB = {
  schemaVersion: 1;
  projects: Project[];
  parking: ParkingItem[];
};

/** Written when a session reaches close-out, cleared when close-out is submitted. */
export type Pending = {
  projectId: string;
  durationMin: number;
  wasFloor: boolean;
  wasColdStart: boolean;
};
