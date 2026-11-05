// Submission storage. The mock implementation persists to the browser's localStorage
// so submissions survive a refresh. Replace `repository` with an HTTP implementation
// (e.g. calling a Python backend backed by SQLite) without changing any page.

import type { Verification } from "./verification-types";

export interface SubmissionRepository {
  list(): Promise<Verification[]>;
  get(id: string): Promise<Verification | undefined>;
  add(v: Verification): Promise<void>;
  nextId(): Promise<string>;
}

const KEY = "hypekyte.submissions.v1";

export function createLocalRepository(seed: () => Verification[]): SubmissionRepository {
  const memory: Verification[] = [];
  const read = (): Verification[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Verification[]) : [];
    } catch {
      return memory;
    }
  };
  const write = (items: Verification[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      memory.splice(0, memory.length, ...items);
    }
  };
  const all = () => [...seed(), ...read()];

  return {
    async list() {
      return all().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    },
    async get(id) {
      return all().find((v) => v.id === id);
    },
    async add(v) {
      write([...read(), v]);
    },
    async nextId() {
      const max = all().reduce((m, v) => Math.max(m, Number(v.id.replace(/\D/g, "")) || 0), 1000);
      return `VR-${max + 1}`;
    },
  };
}
