/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Building {
  id: string;
  name: string;
  location: string;
}

export interface Lift {
  id: string;
  buildingId: string;
  name: string; // e.g., "Lift A", "Service Lift"
  area?: string; // e.g., "FRONT SIDE", "BACK SIDE"
  model: string;
  status: 'Operational' | 'Maintenance' | 'Out of Order' | 'Not operational';
  lastServiceDate?: string;
}

export interface ServiceReport {
  id: string;
  liftId: string;
  buildingId: string;
  date: string;
  technician: string;
  description: string;
  partsReplaced: string[];
  nextServiceDate: string;
  cost: string;
  status?: 'Operational' | 'Maintenance' | 'Out of Order' | 'Not operational';
}

export interface BreakdownReport {
  id: string;
  liftId: string;
  buildingId: string;
  date: string;
  technician: string;
  issue: string;
  resolution?: string;
  status: 'Resolved' | 'Pending' | 'In Progress';
}
