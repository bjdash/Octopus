import { Component } from '@angular/core';
import { Tariff } from '../models';

@Component({
  selector: 'app-tariff',
  templateUrl: './tariff.component.html',
  styleUrls: ['./tariff.component.scss'],
  host: {
    class: 'bottom-gap'
  }
})
export class TariffComponent {
  tariffs: Tariff[] = [];
  valueForMoney: '' | 'green' | 'orange' | 'red' = ''
  constructor() {
    this.getTariff();
  }

  async getTariff() {
    let now = new Date();
    if (now.getMinutes() >= 30) now.setMinutes(30, 0, 0)
    else now.setMinutes(0, 0, 0);

    const res = await fetch(
      `https://api.octopus.energy/v1/products/AGILE-FLEX-22-11-25/electricity-tariffs/E-1R-AGILE-FLEX-22-11-25-N/standard-unit-rates/?period_from=${now.toISOString()}`
    );

    if (res.ok) {
      this.tariffs = ((await res.json()).results as Tariff[])
        .sort(function (a, b) {
          return a.valid_from < b.valid_from
            ? -1
            : a.valid_from > b.valid_from
              ? 1
              : 0;
        }).map(t => {
          t.value_inc_vat = parseFloat(t.value_inc_vat.toFixed(2));
          return t
        });

      if (this.tariffs.length > 0) {
        let current = this.tariffs[0].value_inc_vat;
        this.valueForMoney = ''
        if (current < 20) {
          this.valueForMoney = 'green'
        } else if (current < 27) {
          this.valueForMoney = 'orange'
        } else {
          this.valueForMoney = 'red'
        }
      }
    } else {
      // Sometimes the API will fail!
      throw new Error("Request failed");
    }
  }
}
