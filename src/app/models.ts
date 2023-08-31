export interface Tariff {
  value_exc_vat: number,
  value_inc_vat: number,
  valid_from: string,
  valid_to: string,
  payment_method?: any
}