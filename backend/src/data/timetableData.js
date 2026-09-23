/**
 * Timetable & Train Movement Dataset (Simulation / Timetable Data)
 * Represents scheduled train paths across Kharagpur Division corridors.
 * Used by the Conflict Detection Engine to cross-reference proposed maintenance blocks.
 */

const trainMovements = [
  { id: 'TM-01', trainNo: '12841', name: 'Coromandel Express', corridorId: 'C01', section: 'HWH–SRC', arrival: '07:40', departure: '08:05', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-02', trainNo: '12073', name: 'Howrah Jan Shatabdi', corridorId: 'C01', section: 'SRC–PKU', arrival: '09:10', departure: '09:30', type: 'Express', priority: 'High', forecast: false },
  { id: 'TM-03', trainNo: 'GDS-4412', name: 'Freight (BOXN)', corridorId: 'C01', section: 'PKU–KGP', arrival: '10:15', departure: '10:55', type: 'Goods', priority: 'Medium', forecast: true, forecastConfidence: 72 },
  { id: 'TM-04', trainNo: '18045', name: 'East Coast Express', corridorId: 'C01', section: 'HWH–SRC', arrival: '13:15', departure: '13:35', type: 'Express', priority: 'Medium', forecast: false },
  { id: 'TM-05', trainNo: '22201', name: 'Duronto Express', corridorId: 'C01', section: 'SRC–PKU', arrival: '16:20', departure: '16:40', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-06', trainNo: '12277', name: 'Shatabdi Express', corridorId: 'C02', section: 'BLS–CTC', arrival: '08:30', departure: '08:50', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-07', trainNo: 'GDS-5521', name: 'Freight (BCN)', corridorId: 'C02', section: 'CTC–BBS', arrival: '11:00', departure: '11:45', type: 'Goods', priority: 'Low', forecast: true, forecastConfidence: 65 },
  { id: 'TM-08', trainNo: '12703', name: 'Falaknuma Express', corridorId: 'C02', section: 'KGP–BLS', arrival: '15:10', departure: '15:30', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-09', trainNo: '18409', name: 'Sri Jagannath Express', corridorId: 'C04', section: 'BBS–KUR', arrival: '09:45', departure: '10:05', type: 'Express', priority: 'Medium', forecast: false },
  { id: 'TM-10', trainNo: 'GDS-6610', name: 'Freight (BTAP)', corridorId: 'C05', section: 'SRC–ULT', arrival: '12:30', departure: '13:10', type: 'Goods', priority: 'Low', forecast: true, forecastConfidence: 58 },
]

module.exports = {
  trainMovements,
}
