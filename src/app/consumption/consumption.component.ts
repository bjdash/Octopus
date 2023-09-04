import { Component } from '@angular/core';
import { AccountDetails, Consumption, Tariff } from '../models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-consumption',
  templateUrl: './consumption.component.html',
  styleUrls: ['./consumption.component.scss'],
  host: {
    class: 'bottom-gap'
  }
})
export class ConsumptionComponent {
  accountDetails: AccountDetails = {
    mpan: '',
    electricitySerialNo: '',
    mprn: '',
    gasSerialNo: '',
    apiKey: ''
  }
  activeTab: 'gas' | 'electricity️' = 'electricity️';
  pastDays = 0;
  tariffMap: { [key: string]: number } = {}

  todaysConsumption_e: Consumption[] = []

  constructor(private router: Router) {
    Object.keys(this.accountDetails).forEach(key => {
      this.accountDetails[key as keyof AccountDetails] = localStorage.getItem(key) as string;
    });
    if (Object.values(this.accountDetails).some(v => !v)) {
      this.router.navigate(['settings'])

    } else {
      this.getElectricConsumptionToday(this.pastDays);
    }

  }

  async getElectricConsumptionToday(pastDays: number) {
    console.log(pastDays);

    let fetchTill = new Date();
    fetchTill.setHours(0, 0, 0, 0);
    fetchTill.setDate(fetchTill.getDate() - pastDays)


    const res = await fetch(
      `https://api.octopus.energy/v1/electricity-meter-points/${this.accountDetails.mpan}/meters/${this.accountDetails.electricitySerialNo}/consumption/?period_from=${fetchTill.toISOString()}`,
      {
        headers: {
          Authorization: `Basic ${btoa(this.accountDetails.apiKey + ':')}`
        }
      }
    );

    if (res.ok) {
      const tariffResp = await fetch(
        `https://api.octopus.energy/v1/products/AGILE-FLEX-22-11-25/electricity-tariffs/E-1R-AGILE-FLEX-22-11-25-N/standard-unit-rates/?period_from=${fetchTill.toISOString()}`
      );
      if (tariffResp.ok) {
        ((await tariffResp.json()).results as Tariff[]).forEach(t => {
          this.tariffMap[t.valid_from] = parseFloat(t.value_inc_vat.toFixed(2))
        })
      }
      console.log(this.tariffMap);

      this.todaysConsumption_e = ((await res.json()).results as Consumption[]).map(c => {
        console.log(c.interval_start, new Date(c.interval_start).toISOString());

        c.unitRate = this.tariffMap[new Date(c.interval_start).toISOString().replace(/\.\d+/, "")] || 0;
        return c;
      });


    } else {
      // Sometimes the API will fail!
      throw new Error("Request failed");
    }
  }
}
