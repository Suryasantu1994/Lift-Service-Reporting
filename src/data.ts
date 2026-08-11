/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './lib/firebase';
import { Building, Lift, ServiceReport, BreakdownReport } from './types';

const INITIAL_DATA = {
  buildings: [
    { id: 'b1', name: 'SHIVAJI BHAVAN', location: 'GITAM Campus' },
    { id: 'b2', name: 'VISVESVARAYA BHAVAN', location: 'GITAM Campus' },
    { id: 'b3', name: 'VINAY SADAN', location: 'GITAM Campus' },
    { id: 'b4', name: 'KOKILA SADAN', location: 'GITAM Campus' },
    { id: 'b5', name: 'STAFF QUARTERS', location: 'GITAM Campus' },
    { id: 'b6', name: 'SOUTH GIRLS HOSTEL', location: 'GITAM Campus' },
    { id: 'b7', name: 'NORTH BOYS HOSTEL', location: 'GITAM Campus' },
    { id: 'b8', name: 'GUEST HOUSE', location: 'GITAM Campus' },
  ],
  lifts: [
    { id: 'l1', buildingId: 'b1', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l2', buildingId: 'b1', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l3', buildingId: 'b1', name: 'Lift-3', area: 'BACK SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l4', buildingId: 'b1', name: 'LIFT-4', area: 'BACK SIDE', model: 'Otis', status: 'Operational' },
    
    { id: 'l5', buildingId: 'b2', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Schindler', status: 'Operational' },
    { id: 'l6', buildingId: 'b2', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Schindler', status: 'Operational' },
    { id: 'l7', buildingId: 'b2', name: 'Lift-3', area: 'BACK SIDE', model: 'Schindler', status: 'Operational' },
    { id: 'l8', buildingId: 'b2', name: 'Lift-4', area: 'BACK SIDE', model: 'Schindler', status: 'Out of Order' },
    { id: 'l9', buildingId: 'b2', name: 'LIFT-5', area: 'BACK SIDE', model: 'Schindler', status: 'Operational' },
    { id: 'l10', buildingId: 'b2', name: 'LIFT-6', area: 'BACK SIDE', model: 'Schindler', status: 'Operational' },

    { id: 'l11', buildingId: 'b3', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Kone', status: 'Operational' },
    { id: 'l12', buildingId: 'b3', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Kone', status: 'Operational' },

    { id: 'l13', buildingId: 'b4', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Kone', status: 'Operational' },
    { id: 'l14', buildingId: 'b4', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Kone', status: 'Operational' },

    { id: 'l15', buildingId: 'b5', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l16', buildingId: 'b5', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Otis', status: 'Out of Order' },

    { id: 'l17', buildingId: 'b6', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l18', buildingId: 'b6', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },

    { id: 'l19', buildingId: 'b7', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
    { id: 'l20', buildingId: 'b7', name: 'LIFT-2', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },

    { id: 'l21', buildingId: 'b8', name: 'LIFT-1', area: 'FRONT SIDE', model: 'Otis', status: 'Operational' },
  ],
};

export function useLiftData() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      // Cleanup previous listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (!user) {
        setBuildings([]);
        setLifts([]);
        setReports([]);
        setBreakdowns([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Seed if empty (simplified for this app)
      try {
        const buildingsSnap = await getDocs(collection(db, 'buildings'));
        if (buildingsSnap.empty) {
          console.log('Seeding initial data...');
          for (const b of INITIAL_DATA.buildings) {
            try {
              await setDoc(doc(db, 'buildings', b.id), b);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `buildings/${b.id}`);
            }
          }
          for (const l of INITIAL_DATA.lifts) {
            try {
              await setDoc(doc(db, 'lifts', l.id), l);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `lifts/${l.id}`);
            }
          }
          console.log('Seeding complete.');
        }
      } catch (err) {
        // If it's a permission error during initial check, it might be because the user is not yet fully authorized in rules
        // or just a race condition. We'll log it but not necessarily crash the whole hook if listeners can still be established.
        if (err instanceof Error && !err.message.includes('Firestore Error')) {
          console.warn('Initial data check failed:', err);
        }
      }

      const unsubBuildings = onSnapshot(collection(db, 'buildings'), (snap) => {
        setBuildings(snap.docs.map(d => d.data() as Building));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'buildings'));
      unsubs.push(unsubBuildings);

      const unsubLifts = onSnapshot(collection(db, 'lifts'), (snap) => {
        setLifts(snap.docs.map(d => d.data() as Lift));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'lifts'));
      unsubs.push(unsubLifts);

      const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
        const sortedReports = snap.docs
          .map(d => d.data() as ServiceReport)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setReports(sortedReports);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'reports'));
      unsubs.push(unsubReports);

      const unsubBreakdowns = onSnapshot(collection(db, 'breakdowns'), (snap) => {
        const sortedBreakdowns = snap.docs
          .map(d => d.data() as BreakdownReport)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBreakdowns(sortedBreakdowns);
        setLoading(false);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'breakdowns'));
      unsubs.push(unsubBreakdowns);
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  const addReport = async (report: ServiceReport) => {
    try {
      await setDoc(doc(db, 'reports', report.id), report);
      await updateDoc(doc(db, 'lifts', report.liftId), {
        lastServiceDate: report.date,
        status: report.status || 'Operational'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reports/${report.id}`);
    }
  };

  const addBuilding = async (building: Building) => {
    try {
      await setDoc(doc(db, 'buildings', building.id), building);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `buildings/${building.id}`);
    }
  };

  const updateBuilding = async (id: string, updates: Partial<Building>) => {
    try {
      await updateDoc(doc(db, 'buildings', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `buildings/${id}`);
    }
  };

  const deleteBuilding = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'buildings', id));
      // Cleanup lifts, reports, breakdowns (simplified, should ideally be in a transaction or batch)
      const liftsQuery = query(collection(db, 'lifts'), where('buildingId', '==', id));
      const liftsSnap = await getDocs(liftsQuery);
      for (const d of liftsSnap.docs) {
        await deleteDoc(doc(db, 'lifts', d.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `buildings/${id}`);
    }
  };

  const addLift = async (lift: Lift) => {
    try {
      await setDoc(doc(db, 'lifts', lift.id), lift);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lifts/${lift.id}`);
    }
  };

  const updateLift = async (id: string, updates: Partial<Lift>) => {
    try {
      await updateDoc(doc(db, 'lifts', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lifts/${id}`);
    }
  };

  const deleteLift = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lifts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lifts/${id}`);
    }
  };

  const updateLiftStatus = async (liftId: string, status: Lift['status']) => {
    await updateLift(liftId, { status });
  };

  const addBreakdown = async (breakdown: BreakdownReport) => {
    try {
      await setDoc(doc(db, 'breakdowns', breakdown.id), breakdown);
      
      // Update lift status
      let newStatus: Lift['status'] = 'Operational';
      if (breakdown.status === 'Pending') newStatus = 'Out of Order';
      else if (breakdown.status === 'In Progress') newStatus = 'Maintenance';
      
      await updateDoc(doc(db, 'lifts', breakdown.liftId), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `breakdowns/${breakdown.id}`);
    }
  };

  const updateBreakdown = async (id: string, updates: Partial<BreakdownReport>) => {
    try {
      await updateDoc(doc(db, 'breakdowns', id), updates);
      
      if (updates.status || updates.liftId) {
        const breakdownSnap = await getDoc(doc(db, 'breakdowns', id));
        const breakdown = breakdownSnap.data() as BreakdownReport;
        
        let newStatus: Lift['status'] = 'Operational';
        if (breakdown.status === 'Pending') newStatus = 'Out of Order';
        else if (breakdown.status === 'In Progress') newStatus = 'Maintenance';
        
        await updateDoc(doc(db, 'lifts', breakdown.liftId), { status: newStatus });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `breakdowns/${id}`);
    }
  };

  const deleteBreakdown = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'breakdowns', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `breakdowns/${id}`);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${id}`);
    }
  };

  return {
    buildings,
    lifts,
    reports,
    breakdowns,
    loading,
    addReport,
    deleteReport,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addLift,
    updateLift,
    deleteLift,
    updateLiftStatus,
    addBreakdown,
    updateBreakdown,
    deleteBreakdown,
  };
}
