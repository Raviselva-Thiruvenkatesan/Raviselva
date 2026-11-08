/** Sample model data shared by the lambda and LINQ diagrams. */
export interface BeamRow { Mark: string; Profile: string; Length: number; Level: number; Kg: number }

export const BEAMS: BeamRow[] = [
  { Mark: 'B1', Profile: 'IPE300', Length: 6.0, Level: 1, Kg: 253 },
  { Mark: 'B2', Profile: 'IPE200', Length: 4.5, Level: 1, Kg: 101 },
  { Mark: 'B3', Profile: 'HEA200', Length: 7.2, Level: 1, Kg: 305 },
  { Mark: 'B4', Profile: 'IPE300', Length: 8.0, Level: 2, Kg: 338 },
  { Mark: 'B5', Profile: 'IPE200', Length: 3.0, Level: 2, Kg: 67 },
  { Mark: 'B6', Profile: 'HEA200', Length: 5.5, Level: 2, Kg: 233 },
  { Mark: 'B7', Profile: 'IPE300', Length: 6.5, Level: 3, Kg: 274 },
  { Mark: 'B8', Profile: 'IPE200', Length: 9.0, Level: 3, Kg: 202 }
];
