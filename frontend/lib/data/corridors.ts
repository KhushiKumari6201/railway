import type { Corridor } from '@/lib/types'

export const corridors: Corridor[] = [
  {
    id: 'C01',
    name: 'Howrah–Kharagpur',
    route: 'HWH – SRC – KGP',
    sections: ['HWH–SRC', 'SRC–PKU', 'PKU–KGP'],
    trafficDensity: 'High',
  },
  {
    id: 'C02',
    name: 'Kharagpur–Bhubaneswar',
    route: 'KGP – BLS – CTC – BBS',
    sections: ['KGP–BLS', 'BLS–CTC', 'CTC–BBS'],
    trafficDensity: 'High',
  },
  {
    id: 'C03',
    name: 'Kharagpur–Tatanagar',
    route: 'KGP – GII – TATA',
    sections: ['KGP–GII', 'GII–TATA'],
    trafficDensity: 'Medium',
  },
  {
    id: 'C04',
    name: 'Bhubaneswar–Puri',
    route: 'BBS – KUR – PURI',
    sections: ['BBS–KUR', 'KUR–PURI'],
    trafficDensity: 'Medium',
  },
  {
    id: 'C05',
    name: 'Santragachi–Kharagpur (Freight)',
    route: 'SRC – ULT – KGP',
    sections: ['SRC–ULT', 'ULT–KGP'],
    trafficDensity: 'Low',
  },
]

export const corridorMap = Object.fromEntries(corridors.map((c) => [c.id, c]))

export function corridorName(id: string) {
  return corridorMap[id]?.name ?? id
}
