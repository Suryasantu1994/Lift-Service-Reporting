/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Share2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Building, Lift } from '../types';

interface LiftStatusViewProps {
  buildings: Building[];
  lifts: Lift[];
}

export default function LiftStatusView({ buildings, lifts }: LiftStatusViewProps) {
  const currentDate = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy
  const statusRef = useRef<HTMLDivElement>(null);

  const shareToWhatsApp = async () => {
    if (!statusRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(statusRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `lift-status-${currentDate}.png`, { type: 'image/png' });

      const downloadFallback = async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            alert('Status image copied to clipboard! You can now paste it directly into WhatsApp.');
          }
        } catch (clipError) {
          const link = document.createElement('a');
          link.download = `lift-status-${currentDate.replace(/\//g, '-')}.png`;
          link.href = dataUrl;
          link.click();
        }

        const text = `*GITAM LIFT STATUS REPORT - ${currentDate}*\n\nPlease find the lift status report attached/copied.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      };

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'GITAM Lift Status',
            text: `Lift Status Report - ${currentDate}`,
          });
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Share failed:', shareError);
            await downloadFallback();
          }
        }
      } else {
        await downloadFallback();
      }
    } catch (error) {
      console.error('Error sharing status:', error);
      alert('Failed to generate status image.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Status Report</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Ready for sharing</p>
        </div>
        <button 
          onClick={shareToWhatsApp}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] text-[#ffffff] px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-wider"
        >
          <Share2 className="w-4 h-4" />
          Share on WhatsApp
        </button>
      </div>

      <div className="flex justify-center overflow-x-auto pb-16 pt-8">
        <div 
          ref={statusRef} 
          className="bg-white p-1 font-sans border-[1.5px] border-black inline-block min-w-[700px]"
        >
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-[#004d40] text-white">
                <th className="border border-black p-2 text-left uppercase tracking-tight font-black w-[20%]">LOCATION</th>
                <th className="border border-black p-2 text-center uppercase tracking-tight font-black w-[15%]">AREA</th>
                <th colSpan={2} className="border border-black p-2 text-center uppercase tracking-tight font-black w-[30%]">LIFT OPERATIONAL STATUS</th>
                <th colSpan={2} className="border border-black p-2 text-center uppercase tracking-tight font-black w-[35%]">LIFT</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((building) => {
                const buildingLifts = lifts.filter(l => l.buildingId === building.id);
                // Group lifts by area
                const liftsByArea: { [key: string]: Lift[] } = {};
                buildingLifts.forEach(l => {
                  const area = l.area || 'FRONT SIDE';
                  if (!liftsByArea[area]) liftsByArea[area] = [];
                  liftsByArea[area].push(l);
                });

                const areas = Object.keys(liftsByArea).sort();
                
                // Calculate total rows for this building to set rowspan
                const buildingRows: Lift[][] = [];
                areas.forEach(area => {
                  const areaLifts = liftsByArea[area];
                  for (let i = 0; i < areaLifts.length; i += 2) {
                    buildingRows.push(areaLifts.slice(i, i + 2));
                  }
                });

                let rowCounter = 0;
                return areas.map((area, areaIndex) => {
                  const areaLifts = liftsByArea[area];
                  const areaRows: Lift[][] = [];
                  for (let i = 0; i < areaLifts.length; i += 2) {
                    areaRows.push(areaLifts.slice(i, i + 2));
                  }

                  return areaRows.map((rowLifts, rowIndex) => {
                    const isFirstInBuilding = rowCounter === 0;
                    const isFirstInArea = rowIndex === 0;
                    rowCounter++;

                    const getStatusInfo = (lift?: Lift) => {
                      if (!lift) return { text: 'NIL', color: 'text-slate-300' };
                      if (lift.status === 'Operational') return { text: 'Working', color: 'text-emerald-700' };
                      if (lift.status === 'Maintenance') return { text: 'Down', color: 'text-rose-700' };
                      if (lift.status === 'Out of Order') return { text: 'Down', color: 'text-rose-700' };
                      if (lift.status === 'Not operational') return { text: 'Closed', color: 'text-slate-500' };
                      return { text: 'Closed', color: 'text-slate-500' };
                    };

                    const status1 = getStatusInfo(rowLifts[0]);
                    const status2 = getStatusInfo(rowLifts[1]);

                    return (
                      <tr key={`${building.id}-${area}-${rowIndex}`} className="text-black font-black uppercase">
                        {isFirstInBuilding && (
                          <td 
                            className="border border-black p-2 align-middle" 
                            rowSpan={buildingRows.length}
                          >
                            {building.name}
                          </td>
                        )}
                        {isFirstInArea && (
                          <td 
                            className="border border-black p-2 text-center align-middle" 
                            rowSpan={areaRows.length}
                          >
                            {area}
                          </td>
                        )}
                        
                        {/* Status 1 */}
                        <td className={`border border-black p-2 text-center w-[15%] ${status1.color}`}>
                          {status1.text}
                        </td>
                        {/* Status 2 */}
                        <td className={`border border-black p-2 text-center w-[15%] ${status2.color}`}>
                          {status2.text}
                        </td>
                        
                        {/* Lift 1 Name */}
                        <td className="border border-black p-2 text-center w-[17.5%]">
                          {rowLifts[0]?.name || 'NIL'}
                        </td>
                        {/* Lift 2 Name */}
                        <td className="border border-black p-2 text-center w-[17.5%]">
                          {rowLifts[1]?.name || 'NIL'}
                        </td>
                      </tr>
                    );
                  });
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
