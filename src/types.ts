export enum ViewState {
  BLOCKED = 'BLOCKED',
  DETAILS = 'DETAILS',
  ALTERNATIVES = 'ALTERNATIVES'
}

export interface LegalSummary {
  title: string;
  explanation: string;
  consequences: string;
}
