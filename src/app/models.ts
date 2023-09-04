export interface Tariff {
  value_exc_vat: number,
  value_inc_vat: number,
  valid_from: string,
  valid_to: string,
  payment_method?: any,
  isTomorrow?: boolean
}

export interface Consumption {
  consumption: number,
  interval_start: string,
  interval_end: string
}

export interface AccountDetails {
  apiKey: string
  electricitySerialNo: string
  gasSerialNo: string
  mpan: string
  mprn: string
}